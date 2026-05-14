/**
 * UpgradeBarViewModel
 *
 * Root ViewModel for the Upgrade Bar UI (top of screen).
 * Holds 4 fixed slots: CRITICAL, INTEREST, VAULT, FRENZY.
 *
 * Slots start hidden (isVisible = false). UpgradeBarController toggles
 * visibility as each feature is unlocked.
 */
import { uiViewModel, UiViewModel } from 'meta/worlds';
import type { Maybe, TextureAsset } from 'meta/worlds';
import { iconCritical, iconIncome, iconVault, iconFrenzy } from './Assets';

@uiViewModel()
export class UpgradeSlotViewModel extends UiViewModel {
  public title: string = '';
  public value: string = '';
  public valueColor: string = '#FFFFFF';
  public progressPercent: number = 0;
  public progressText: string = '';
  public progressBarColor: string = '#FFFFFF';
  public progressVisible: boolean = true;
  public isVisible: boolean = false;
  public icon: Maybe<TextureAsset> = null;
  /** Border color — flashes to slot's signature color when the upgrade fires. */
  public borderColor: string = '#000000';
}

@uiViewModel()
export class UpgradeBarViewModel extends UiViewModel {
  public slots: readonly UpgradeSlotViewModel[] = [];

  override readonly events = {};
}

/** Creates the 4 fixed slots; all start hidden until their feature unlocks. */
export function createUpgradeBarViewModel(): UpgradeBarViewModel {
  const vm = new UpgradeBarViewModel();

  const crit = new UpgradeSlotViewModel();
  crit.title = 'CRITICAL';
  crit.valueColor = '#FF3D9A';
  crit.progressBarColor = '#FF3D9A';
  crit.progressVisible = false;
  crit.icon = iconCritical;

  const interest = new UpgradeSlotViewModel();
  interest.title = 'INTEREST';
  interest.valueColor = '#FFD700';
  interest.progressBarColor = '#FFD700';
  interest.progressVisible = false;
  interest.icon = iconIncome;

  const vault = new UpgradeSlotViewModel();
  vault.title = 'VAULT';
  vault.valueColor = '#50C8FF';
  vault.progressBarColor = '#50C8FF';
  vault.progressVisible = false;
  vault.icon = iconVault;

  const frenzy = new UpgradeSlotViewModel();
  frenzy.title = 'FRENZY';
  frenzy.valueColor = '#FF9F43';
  frenzy.progressBarColor = '#FF9F43';
  frenzy.progressVisible = false;
  frenzy.icon = iconFrenzy;

  vm.slots = [crit, interest, vault, frenzy];
  return vm;
}
