/**
 * AchievementHudController — ViewModel controller for the Achievements gauge overlay.
 *
 * Component Attachment: Scene entity (AchievementUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI runs on client via ExecuteOn.Owner
 *
 * Displays 8 achievement rows, each as a horizontal gauge with a skull button
 * that opens a reward tier popup.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  LocalEvent,
  CustomUiComponent,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { UiEvents } from '../Types';
import { ACHIEVEMENT_GROUPS, TIER_REWARDS } from '../Defs/AchievementDefs';
import { SaveService } from '../Services/SaveService';

// --- LocalEvent to open the overlay ---
export class OpenAchievementsPayload {}
export const OpenAchievementsEvent = new LocalEvent<OpenAchievementsPayload>('OpenAchievementsEvent', OpenAchievementsPayload);

// --- Reward tier row sub-ViewModel ---
@uiViewModel()
export class AchievementRewardTierViewModel extends UiViewModel {
  tierName: string = '';
  tierTarget: string = '0';
  skullReward: string = '0';
  /** 'claimable' | 'claimed' | 'locked' */
  state: string = 'locked';
  /** Claim button visibility */
  claimVisible: boolean = false;
  /** Claimed checkmark visibility */
  claimedVisible: boolean = false;
  /** Locked overlay visibility */
  lockedVisible: boolean = true;
  /** Text color: gold for claimable, dim for others */
  textColor: string = '#FF888888';
  /** Opacity: 1 for claimable/claimed, 0.5 for locked */
  rowOpacity: number = 0.5;
  /** Parameter for claim button: "groupId:tierIndex" */
  claimParam: string = '';
  /** Dynamic claim button text: "Claim X" where X is the skull reward */
  claimButtonText: string = 'Claim';
  /** Tier background color (shifted tier coloring) */
  tierBgColor: string = '#00000000';
}

// --- Achievement gauge row sub-ViewModel ---
@uiViewModel()
export class AchievementGaugeViewModel extends UiViewModel {
  name: string = '';
  description: string = '';
  /** Progress text e.g. "347 / 500" */
  progressText: string = '0 / 50';
  /** Bar fill width in px (max GAUGE_WIDTH) */
  barWidth: number = 0;
  /** Name color: gold always for themed look */
  nameColor: string = '#FFf5c518';
  /** Reward button text: "See rewards" or "Claim rewards" */
  rewardButtonText: string = 'See rewards';
  /** Reward button text color: gold if claimable, dim otherwise */
  rewardButtonColor: string = '#FF888888';
  /** Group index for CommandParameter binding */
  groupIndex: string = '0';
  /** Tier background color hex (ARGB) based on completed tiers */
  tierBgColor: string = '#00000000';
  /** Whether the skull button should show the pulse animation (unclaimed rewards exist) */
  skullAnimVisible: boolean = false;
  /** Whether the skull button should be static (no unclaimed rewards) */
  skullStaticVisible: boolean = true;
}

// --- Reward popup ViewModel ---
@uiViewModel()
export class AchievementRewardPopupViewModel extends UiViewModel {
  override readonly events = {
    claimTap: UiEvents.achievementClaimTap,
  };
  visible: boolean = false;
  groupName: string = '';
  tiers: readonly AchievementRewardTierViewModel[] = [];
}

// --- Main ViewModel ---
@uiViewModel()
export class AchievementViewModel extends UiViewModel {
  override readonly events = {
    closeTap: UiEvents.achievementCloseTap,
    skullTap: UiEvents.achievementSkullTap,
  };

  visible: boolean = false;
  achievements: readonly AchievementGaugeViewModel[] = [];
  rewardPopup: AchievementRewardPopupViewModel = new AchievementRewardPopupViewModel();
}

// --- Component ---
@component()
export class AchievementHudController extends Component {
  private viewModel: Maybe<AchievementViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  private static readonly GAUGE_WIDTH = 880;

  /** Currently viewed group index for reward popup */
  private _popupGroupIndex: number = -1;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;

    this.viewModel = new AchievementViewModel();
    this.viewModel.visible = false;
    this.viewModel.rewardPopup = new AchievementRewardPopupViewModel();
    this.viewModel.rewardPopup.visible = false;
    this.uiComponent.dataContext = this.viewModel;
  }

  @subscribe(OpenAchievementsEvent, { execution: ExecuteOn.Owner })
  onOpenAchievements(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    this._populateAchievements();
    this.viewModel.visible = true;
    this.viewModel.rewardPopup.visible = false;
    this.uiComponent.isVisible = true;
    console.log('[AchievementHudController] Achievements overlay opened');
  }

  @subscribe(UiEvents.achievementCloseTap, { execution: ExecuteOn.Owner })
  onCloseTap(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    // If popup is open, close popup first
    if (this.viewModel.rewardPopup.visible) {
      this.viewModel.rewardPopup.visible = false;
      console.log('[AchievementHudController] Reward popup closed');
      return;
    }

    this.viewModel.visible = false;
    this.uiComponent.isVisible = false;
    console.log('[AchievementHudController] Achievements overlay closed');
  }

  @subscribe(UiEvents.achievementSkullTap, { execution: ExecuteOn.Owner })
  onSkullTap(p: UiEvents.AchievementSkullTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const groupIndex = parseInt(p.parameter, 10);
    if (isNaN(groupIndex) || groupIndex < 0 || groupIndex >= ACHIEVEMENT_GROUPS.length) return;

    this._popupGroupIndex = groupIndex;
    this._populateRewardPopup(groupIndex);
    this.viewModel.rewardPopup.visible = true;
    console.log(`[AchievementHudController] Reward popup opened for group ${ACHIEVEMENT_GROUPS[groupIndex].id}`);
  }

  @subscribe(UiEvents.achievementClaimTap, { execution: ExecuteOn.Owner })
  onClaimTap(p: UiEvents.AchievementClaimTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    // parameter format: "groupId:tierIndex"
    const parts = p.parameter.split(':');
    if (parts.length < 2) return;
    const groupId = parts[0];
    const tierIndex = parseInt(parts[1], 10);
    if (isNaN(tierIndex)) return;

    const save = SaveService.get();
    const group = ACHIEVEMENT_GROUPS.find(g => g.id === groupId);
    if (!group) return;

    // Validate: only the next sequential tier (tierIndex === claimed) can be claimed
    const current = save.getAchievementStat(group.statKey);
    const claimed = save.getClaimedTiers(groupId);
    if (tierIndex >= group.tiers.length) return;
    if (tierIndex === claimed && current >= group.tiers[tierIndex]) {
      // Award the reward
      const reward = tierIndex < TIER_REWARDS.length ? TIER_REWARDS[tierIndex] : TIER_REWARDS[TIER_REWARDS.length - 1];
      save.claimTierReward(groupId, reward);
      console.log(`[AchievementHudController] Claimed tier ${tierIndex} for ${groupId}: +${reward} skulls`);

      // Refresh the popup and the achievements list
      this._populateRewardPopup(this._popupGroupIndex);
      this._populateAchievements();
    }
  }

  private _populateRewardPopup(groupIndex: number): void {
    if (!this.viewModel) return;

    const group = ACHIEVEMENT_GROUPS[groupIndex];
    const save = SaveService.get();
    const current = save.getAchievementStat(group.statKey);
    const claimed = save.getClaimedTiers(group.id);

    const tiers: AchievementRewardTierViewModel[] = [];

    // Only show 3 categories:
    // 1. Claimed tiers (already claimed)
    // 2. Claimable tiers (completed but not yet claimed)
    // 3. Next locked tier (the single next uncompleted tier)
    let nextLockedShown = false;

    for (let i = 0; i < group.tiers.length; i++) {
      const completed = current >= group.tiers[i];
      const isClaimed = i < claimed;
      const isNextClaimable = completed && i === claimed;

      // Skip tiers beyond the immediate next locked one
      if (!completed && !isClaimed && !isNextClaimable) {
        if (nextLockedShown) {
          // Already showed the next locked tier — skip all further locked tiers
          continue;
        }
        nextLockedShown = true;
      }

      const tier = new AchievementRewardTierViewModel();
      tier.tierName = group.tierNames[i] || `Tier ${i + 1}`;
      tier.tierTarget = `${group.tiers[i]}`;
      const reward = i < TIER_REWARDS.length ? TIER_REWARDS[i] : TIER_REWARDS[TIER_REWARDS.length - 1];
      tier.skullReward = `${reward}`;
      tier.claimParam = `${group.id}:${i}`;
      tier.claimButtonText = `Claim ${reward}`;

      // Tier background color in popup: only completed tiers get color; current/in-progress = transparent
      const tierCompleted = completed || isClaimed;
      tier.tierBgColor = AchievementHudController._getPopupTierBgColor(i, i === group.tiers.length - 1, tierCompleted);

      if (isNextClaimable) {
        tier.state = 'claimable';
        tier.claimVisible = true;
        tier.claimedVisible = false;
        tier.lockedVisible = false;
        tier.textColor = '#FFf5c518';
        tier.rowOpacity = 1;
      } else if (completed && isClaimed) {
        tier.state = 'claimed';
        tier.claimVisible = false;
        tier.claimedVisible = true;
        tier.lockedVisible = false;
        tier.textColor = '#FF88AA88';
        tier.rowOpacity = 0.7;
      } else {
        tier.state = 'locked';
        tier.claimVisible = false;
        tier.claimedVisible = false;
        tier.lockedVisible = true;
        tier.textColor = '#FF888888';
        tier.rowOpacity = 0.5;
      }

      tiers.push(tier);
    }

    this.viewModel.rewardPopup.groupName = group.name;
    this.viewModel.rewardPopup.tiers = tiers;
  }

  private _populateAchievements(): void {
    if (!this.viewModel) return;

    const save = SaveService.get();
    const rows: AchievementGaugeViewModel[] = [];

    for (let gi = 0; gi < ACHIEVEMENT_GROUPS.length; gi++) {
      const group = ACHIEVEMENT_GROUPS[gi];
      const current = save.getAchievementStat(group.statKey);
      const tiers = group.tiers;
      const maxTier = tiers[tiers.length - 1];

      // Find the next uncompleted tier index
      let nextTierIndex = tiers.length; // all completed by default
      for (let i = 0; i < tiers.length; i++) {
        if (current < tiers[i]) {
          nextTierIndex = i;
          break;
        }
      }

      const allComplete = nextTierIndex >= tiers.length;

      // Gauge max = next uncompleted tier target. If all done, use last tier.
      const gaugeMax = allComplete ? maxTier : tiers[nextTierIndex];
      const displayCurrent = Math.min(current, gaugeMax);

      // Bar fill: proportional to the current tier target
      const fraction = gaugeMax > 0 ? Math.min(displayCurrent / gaugeMax, 1) : 0;
      const barWidth = Math.round(fraction * AchievementHudController.GAUGE_WIDTH);

      // Pick name from tierNames based on how many tiers are completed
      const displayName = group.tierNames && group.tierNames.length > nextTierIndex
        ? group.tierNames[nextTierIndex]
        : group.name;

      // Progress text
      const progressText = `${displayCurrent} / ${gaugeMax}`;

      // Build dynamic description from template
      let description = group.description;
      if (group.descriptionTemplate) {
        const target = allComplete ? maxTier : tiers[nextTierIndex];
        description = group.descriptionTemplate.replace('{0}', `${target}`);
      }

      // Tier display
      const totalTiers = tiers.length;
      const currentTier = allComplete ? totalTiers : nextTierIndex + 1;

      const row = new AchievementGaugeViewModel();
      row.name = `${displayName} (Tier ${currentTier}/${totalTiers})`;
      row.description = description;
      row.progressText = progressText;
      row.barWidth = barWidth;
      row.nameColor = '#FFf5c518';

      // Determine reward button state: any unclaimed completed tiers?
      const claimed = save.getClaimedTiers(group.id);
      // completedTierCount = how many tiers are done
      const completedTierCount = allComplete ? tiers.length : nextTierIndex;
      const hasUnclaimedRewards = claimed < completedTierCount;
      row.rewardButtonText = hasUnclaimedRewards ? 'Claim' : 'Rewards';
      row.rewardButtonColor = hasUnclaimedRewards ? '#FFf5c518' : '#FF888888';
      row.skullAnimVisible = hasUnclaimedRewards;
      row.skullStaticVisible = !hasUnclaimedRewards;
      row.groupIndex = `${gi}`;

      // Tier background color based on how many tiers completed (subtle ~25% opacity)
      // 0 = transparent, 1-2 = bronze, 3-4 = silver, 5-6 = gold, 7-8 = red, all = purple
      row.tierBgColor = AchievementHudController._getTierBgColor(completedTierCount, allComplete);

      rows.push(row);
    }

    this.viewModel.achievements = rows;
  }

  /**
   * Returns an ARGB hex color string for the achievement row background.
   * Colors applied in pairs (2-by-2):
   * 0 completed = transparent, 1-2 = bronze, 3-4 = silver, 5-6 = gold,
   * 7-8 = red, all complete = purple. ~25% opacity for subtlety.
   */
  private static _getTierBgColor(completedTiers: number, allComplete: boolean): string {
    if (allComplete) return '#407B2D8B'; // Purple (all complete)
    if (completedTiers <= 0) return '#00000000'; // Transparent
    if (completedTiers <= 2) return '#40CD7F32'; // Bronze (1-2)
    if (completedTiers <= 4) return '#40C0C0C0'; // Silver (3-4)
    if (completedTiers <= 6) return '#40FFD700'; // Gold (5-6)
    return '#40CC2222'; // Red (7-8)
  }

  /**
   * Returns an ARGB hex color string for the reward popup tier row.
   * Colors applied in pairs (2-by-2):
   * Tier 1&2 (index 0,1) = bronze, Tier 3&4 (index 2,3) = silver,
   * Tier 5&6 (index 4,5) = gold, Tier 7&8 (index 6,7) = red,
   * Last tier (if odd/remaining) = purple. Only completed tiers show color.
   */
  private static _getPopupTierBgColor(tierIndex: number, isLastTier: boolean, completed: boolean): string {
    if (!completed) return '#00000000'; // Current/in-progress tier = transparent
    if (isLastTier) return '#407B2D8B'; // Purple (last tier if odd/remaining)
    if (tierIndex <= 1) return '#40CD7F32'; // Bronze (tier 1 & 2)
    if (tierIndex <= 3) return '#40C0C0C0'; // Silver (tier 3 & 4)
    if (tierIndex <= 5) return '#40FFD700'; // Gold (tier 5 & 6)
    return '#40CC2222'; // Red (tier 7 & 8)
  }
}
