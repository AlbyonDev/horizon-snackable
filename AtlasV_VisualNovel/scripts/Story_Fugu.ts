/**
 * Story_Fugu — Fugu's narrative content in Ink format.
 *
 * Parsed by parseInk() in InkParser.ts.
 *
 * Naming convention:
 *   fugu_t<tier>_c<cast>_b<beat>
 *
 * Character voice: Short energetic bursts, repetitions, self-interruptions,
 * sudden silences when loneliness surfaces. Signature phrase: "Trust me!"
 *
 * Inspired by: Naruto Uzumaki — loneliness, desperate desire for recognition,
 * boundless energy hiding deep sadness, talks to fill the silence.
 *
 * Delta calibration (scale -10 / +50):
 *   +5  emotional breakthrough, vulnerability accepted
 *   +4  real opening, significant moment
 *   +3  sincere positive, marked interest
 *   +2  slightly positive
 *   +1  neutral-positive
 *    0  deflection
 *   -2  mild rejection
 *   -5  harsh rejection, fear triggered
 */

export const FUGU_STORY: string = `

// ============================================================
// TIER 1 — UNAWARE: "Someone finally sees me!" (Casts 1–2)
// ============================================================

=== fugu_t1_c1_b1 ===
Hey! HEY! You can see me?!
For real? You're actually looking at me?
Nobody ever looks at me! Never!
I'm Fugu! Fugu the pufferfish!
You're staying? Please say you're staying!

* [WAIT] #delta:3 #expr:warm #icon:warmth #drift:CHARMED #flag:fact.fugu.appearance
    You... you're waiting?
    For me?
    ...
    Nobody's ever waited for me.
    Thank you. Really. Thank you, trust me!
    -> fugu_t1_c1_b2

* [TWITCH] #delta:5 #expr:warm #icon:delight #drift:CHARMED #flag:fact.fugu.appearance
    Oh! You moved! You're playing?!
    We're playing together?! For real?!
    Wait I'm gonna... *puffs up with excitement*
    Oops! Sorry! I can't control it when I'm happy!
    But it's cool, right? We're having fun, trust me!
    -> fugu_t1_c1_b2

* [DRIFT] #delta:-2 #expr:alarmed #icon:sadness #drift:TROUBLED #flag:fact.fugu.appearance
    Huh? You... you're drifting away?
    Already?
    But... but we just met...
    Is it my spines? Am I scary?
    Wait! Come back! Please!
    -> fugu_t1_c1_b2

* [REEL] #delta:-5 #expr:alarmed #icon:shock #drift:SCARED #flag:fact.fugu.appearance
    NO! Not that!
    You... you wanna grab me?!
    Already?! But we don't even know each other!
    *puffs up in panic, spines raised*
    Let go! LET GO!
    -> fugu_t1_c1_b2


=== fugu_t1_c1_b2 ===
...
Sorry.
I talk too much.
...
It's just that... nobody usually stays.
They see the spines and... yeah.
...
But you're still here.
...
That's... that's good.

* [WAIT] #delta:3 #expr:warm #icon:warmth #drift:CHARMED #flag:fact.fugu.talks
    ...
    You're not saying anything.
    That's... actually restful.
    Usually I fill the silence all by myself.
    ...
    Thank you.
    -> END

* [TWITCH] #delta:2 #expr:curious #icon:curiosity #drift:WARM #flag:fact.fugu.talks
    Oh! You want me to keep going?
    I've got tons of stuff to tell!
    Like yesterday I found a piece of seaweed that looked like a face!
    Wanna see? Well... it's gone now.
    But I can show you where it was!
    -> END

* [DRIFT] #delta:0 #expr:neutral #icon:hesitation #drift:WARY #flag:fact.fugu.talks
    ...
    Ok.
    It's fine.
    ...
    Maybe tomorrow?
    -> END

* [REEL] #delta:-2 #expr:alarmed #icon:shock #drift:SCARED
    Again?!
    ...
    I'm toxic you know. Very toxic.
    You shouldn't touch me.
    ...
    It's for your own good.
    Trust me.
    -> END


=== fugu_t1_c2_b1 ===
YOU CAME BACK!!!
I... I thought you wouldn't come back!
...
Wait. Breathe Fugu. Breathe.
...
...ok.
Hi.
...
I practiced that all night. Just "hi." To be normal.
I'm not very good at being normal.

* [WAIT] #delta:3 #expr:warm #icon:warmth #drift:CHARMED
    ...
    You're letting me be weird?
    Without leaving?
    ...
    That's... nobody does that.
    Nobody.
    -> fugu_t1_c2_b2

* [TWITCH] #delta:4 #expr:warm #icon:delight #drift:CHARMED #flag:mood.fugu.first_play #flag:fact.fugu.puffs
    Ha! You wanna play again?!
    I learned a new trick! Watch!
    *puffs up and does little circles*
    That's my joy dance! See?
    Trust me, nobody's ever seen it!
    -> fugu_t1_c2_b2

* [DRIFT] #delta:-1 #expr:neutral #icon:hesitation #drift:WARY
    Oh... you wanna leave already?
    ...
    No no it's fine. It's normal.
    People leave.
    ...
    Everyone leaves.
    -> fugu_t1_c2_b2

* [REEL] #delta:-3 #expr:alarmed #icon:shock #drift:SCARED
    No no no!
    We just saw each other again!
    ...
    Why... why do people always do that?
    Get close just to grab you?
    -> fugu_t1_c2_b2


=== fugu_t1_c2_b2 ===
You know...
...
I counted.
You're the second person who came back.
The first was a snail.
...
He died.
Of old age though! Not... not because of me!
...
Probably not because of me.

* [WAIT] #delta:3 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.fugu.told_about_snail
    ...
    Thanks for not laughing.
    ...
    The seaweed laughs. I know it doesn't really laugh.
    But in my head, it laughs.
    ...
    You don't laugh.
    That's good.
    -> END

* [TWITCH] #delta:2 #expr:curious #icon:curiosity #drift:WARM
    Haha... yeah it's kinda sad when you put it that way.
    ...
    But it's true, trust me!
    His name was... well he didn't have a name.
    But I called him "Slowpoke."
    Because... you know.
    -> END

* [DRIFT] #delta:0 #expr:neutral #icon:hesitation #drift:NEUTRAL
    ...
    Yeah.
    ...
    It's a sad story.
    I shouldn't have told it.
    ...
    Forget it.
    -> END

* [REEL] #delta:-2 #expr:alarmed #icon:sadness #drift:WARY
    Stop!
    ...
    It's not funny.
    ...
    I'm telling you something important and you...
    ...
    No. Forget it. It's nothing.
    -> END


// ============================================================
// TIER 2 — CURIOUS: "You're really staying?" (Casts 3–4)
// ============================================================

=== fugu_t2_c3_b1 ===
You know you're weird?
...
No! Not mean weird! Good weird!
Like... you're not scared.
The others are scared.
...
Look.
*extends a fin*
See the spines? If I puff up...
They come out. With poison.
...
A lot of poison.

* [WAIT] #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.fugu.showed_spines #flag:fact.fugu.toxic
    ...
    You didn't move.
    I showed my spines and you didn't move.
    ...
    The other fish... when I was little...
    They ran away. Well, swam away.
    ...
    You stay.
    Why do you stay?
    -> fugu_t2_c3_b2

* [TWITCH] #delta:3 #expr:curious #icon:curiosity #drift:WARM #flag:fact.fugu.toxic
    Ha! You think it's cool?!
    Really?!
    Nobody ever said it was cool!
    ...
    Wait I can puff up more!
    *POOF*
    Tadaaaa! See?! I'm like a balloon!
    -> fugu_t2_c3_b2

* [DRIFT] #delta:-1 #expr:neutral #icon:sadness #drift:WARY
    ...you're backing away.
    ...
    That's normal.
    I understand.
    ...
    It's toxic. Very toxic.
    People are right to be scared.
    -> fugu_t2_c3_b2

* [REEL] #delta:-3 #expr:alarmed #icon:shock #drift:SCARED
    HEY!
    MY SPINES CAME OUT!
    You're gonna get hurt!
    BACK OFF!
    ...
    ...please back off. I don't wanna hurt you.
    -> fugu_t2_c3_b2


=== fugu_t2_c3_b2 ===
...
When I was little...
...no forget it.
...
...
Ok. I'll say it. Because you're staying.
...
My family left me. In the deep waters.
When my toxins got too strong.
They said I was a curse.
...
I didn't even have a name back then.

* [WAIT] #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:secret.fugu.family_abandoned
    ...
    You're listening.
    ...
    Nobody listens when I talk about this.
    Or they say "oh that's sad" and leave.
    ...
    You just... stay there.
    ...
    That's enough. Trust me.
    -> END

* [TWITCH] #delta:2 #expr:curious #icon:hesitation #drift:WARM
    ...
    No it's fine. It was a long time ago.
    ...
    Ok it's a little not-fine.
    ...
    But I survived! See? I'm here!
    Strong as a rock! Trust me!
    -> END

* [DRIFT] #delta:0 #expr:neutral #icon:sadness #drift:TROUBLED
    ...
    Yeah.
    That's a heavy story.
    Sorry.
    ...
    We can talk about something else.
    Like... seaweed. Seaweed is nice.
    -> END

* [REEL] #delta:-3 #expr:alarmed #icon:shock #drift:SCARED
    Stop! I puff up when I'm scared!
    ...
    See?! That's the problem!
    I can't be close to someone without risking hurting them!
    ...
    That's why they left.
    All of them.
    -> END


=== fugu_t2_c4_b1 ===
Hey.
...
Hey.
...
I thought of something last night.
...
If I concentrate really hard...
I can keep my spines in.
Even when I'm happy.
...
Look! I'm happy right now. And nothing's coming out!
...
...
...ok maybe one. But just one!

* [WAIT] #delta:3 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.fugu.trying_control
    ...
    See? I'm getting better!
    For you. So you'll stay.
    ...
    It's the first time I have a reason to get better.
    ...
    Trust me.
    -> fugu_t2_c4_b2

* [TWITCH] #delta:4 #expr:warm #icon:delight #drift:CHARMED #flag:fact.fugu.puffs
    Ha! You're clapping?! Well... you're moving like it!
    THANK YOU!
    ...
    I worked all night! All night!
    For you! Because you come back!
    And I want you to keep coming back!
    -> fugu_t2_c4_b2

* [DRIFT] #delta:-1 #expr:neutral #icon:hesitation #drift:WARY #flag:fact.fugu.puffs
    ...you don't care?
    ...
    I worked so hard...
    ...
    No. It's fine. I'm doing it for myself.
    Not for others.
    ...
    ...well yeah. A little for you.
    -> fugu_t2_c4_b2

* [REEL] #delta:-2 #expr:alarmed #icon:shock #drift:SCARED
    NO!
    *POOF — puffs up in panic*
    ...
    See?! See what happens?!
    The second someone tries to grab me I lose control!
    It's been like this forever!
    -> fugu_t2_c4_b2


=== fugu_t2_c4_b2 ===
You know what's weird?
...
Nighttime. When I'm all alone.
In the deep.
...
I talk to rocks.
...
I know they don't answer. I'm not stupid.
But the silence... the silence is too heavy.
So I fill it.
I fill it all the time.
...
Except now.
With you I... I don't need to fill as much.

* [WAIT] #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.fugu.silence_ok
    ...
    ...
    See? Right now. This silence.
    It doesn't hurt.
    ...
    It's the first time.
    -> END

* [TWITCH] #delta:2 #expr:curious #icon:curiosity #drift:WARM
    Ha! You want me to keep talking?
    I can! I've got tons of stuff!
    ...
    But... it's also nice to just... be here.
    Right?
    -> END

* [DRIFT] #delta:0 #expr:neutral #icon:hesitation #drift:NEUTRAL
    ...
    Don't leave while I'm saying important stuff.
    ...
    Please.
    -> END

* [REEL] #delta:-2 #expr:alarmed #icon:sadness #drift:WARY
    ...
    I just told you something vulnerable and you...
    ...
    No. It's my fault. I shouldn't have said that.
    People use vulnerable stuff against you.
    ...
    Forget what I said.
    -> END


// ============================================================
// TIER 3 — FAMILIAR: "My first friend" (Casts 5–6)
// ============================================================

=== fugu_t3_c5_b1 ===
...
I'm gonna tell you something.
A real thing. Not a joke.
...
When I was little.
After my family left.
...
I invented friends.
Three of them. They had names and everything.
Bizu, Plop, and Big Algae.
...
I talked to them every day.
For... a long time.

* [WAIT] #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:secret.fugu.imaginary_friends #flag:fact.fugu.alone
    ...
    You're not judging?
    ...
    Usually when I say that people make a face.
    Like "oh poor thing" or "he's crazy."
    ...
    You just... listen.
    ...
    That's the best gift anyone's ever given me.
    Trust me.
    -> fugu_t3_c5_b2

* [TWITCH] #delta:3 #expr:curious #icon:curiosity #drift:WARM
    You wanna know their personalities?!
    Bizu was the brave one! He wasn't scared of anything!
    Plop never talked but we understood each other!
    And Big Algae... she was big. That's it.
    ...
    It's pathetic right?
    -> fugu_t3_c5_b2

* [DRIFT] #delta:0 #expr:neutral #icon:sadness #drift:TROUBLED #flag:fact.fugu.alone
    ...
    Yeah. I know.
    ...
    I shouldn't have said that.
    -> fugu_t3_c5_b2

* [REEL] #delta:-3 #expr:alarmed #icon:shock #drift:SCARED
    Don't touch me!
    ...
    I just told you a secret and you...
    ...
    *puffs up, spines raised*
    Go away.
    -> fugu_t3_c5_b2


=== fugu_t3_c5_b2 ===
The day I stopped talking to them...
That's the day I realized they weren't real.
...
It took a while.
...
I felt so stupid.
And so alone.
...
But now...
...
You're real.
Right?
You're real?

* [WAIT] #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.fugu.confirmed_real #flag:fact.fugu.alone
    ...
    Ok.
    ...
    Ok.
    ...
    I think I'm gonna cry. Just a little.
    It's nothing. It's happiness. Trust me.
    -> END

* [TWITCH] #delta:3 #expr:warm #icon:delight #drift:CHARMED
    Ha! Yes! You moved! You're real!
    Imaginary ones don't move like that!
    ...
    Sorry. That's a dumb test.
    But it works.
    You pass the test. You're real.
    -> END

* [DRIFT] #delta:-1 #expr:neutral #icon:sadness #drift:TROUBLED
    ...
    You're leaving?
    ...
    No... no come back...
    Real ones come back.
    ...
    Come back. Please.
    -> END

* [REEL] #delta:-3 #expr:alarmed #icon:shock #drift:SCARED
    Real ones don't grab!
    ...
    Real ones...
    ...
    I don't know what real ones do.
    I've never had one.
    -> END


=== fugu_t3_c6_b1 ===
Hey...
...
I have a question.
A real question.
...
Are you scared of me?
...
It's ok if yes. I'd understand.
My spines. The poison.
The fact that I puff up when I'm stressed.
...
Everyone's scared.
...
What about you?

* [WAIT] #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.fugu.not_afraid
    ...
    ...
    You know what you just gave me?
    ...
    I spent my entire life trying not to be scary.
    Making myself small. Hiding my spines.
    ...
    And you stay. Even knowing.
    ...
    That's... that's huge. Trust me.
    -> fugu_t3_c6_b2

* [TWITCH] #delta:3 #expr:curious #icon:curiosity #drift:WARM
    Aha! Playing tough?!
    ...
    No sorry. You ARE tough.
    Because you're here. In front of the most toxic fish in the lake.
    And you're playing with it.
    ...
    You're either very brave or very stupid.
    ...
    I like both.
    -> fugu_t3_c6_b2

* [DRIFT] #delta:-1 #expr:neutral #icon:sadness #drift:WARY
    ...
    That's an answer too.
    ...
    I understand.
    -> fugu_t3_c6_b2

* [REEL] #delta:-4 #expr:alarmed #icon:shock #drift:SCARED
    SEE! You see!
    You wanna capture me! That's not the same as not being scared!
    ...
    Being scared is... human. Normal.
    Wanting to grab is... something else.
    -> fugu_t3_c6_b2


=== fugu_t3_c6_b2 ===
...
Sometimes I wonder...
...
If I'm a monster.
...
Not like an evil monster. Just...
Something that hurts without meaning to.
That can't be touched.
That can't be close.
...
That's what a monster is right?
Hurting just by existing?

* [WAIT] #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:secret.fugu.not_monster
    ...
    ...
    Thank you.
    ...
    I know you didn't say anything.
    But your silence... it says "no."
    ...
    That's the most beautiful "no" I've ever heard.
    -> END

* [TWITCH] #delta:3 #expr:curious #icon:curiosity #drift:WARM
    ...
    You think that's a stupid question?
    ...
    Maybe.
    ...
    Thanks for thinking it's stupid.
    That means the answer is obvious to you.
    -> END

* [DRIFT] #delta:0 #expr:neutral #icon:hesitation #drift:TROUBLED
    ...you don't know what to say.
    ...
    That's ok. There's no right answer.
    ...
    I ask myself every day anyway.
    -> END

* [REEL] #delta:-3 #expr:alarmed #icon:shock #drift:SCARED
    ...
    Grabbing a monster... that's an answer too.
    ...
    It's not the one I was hoping for.
    -> END


// ============================================================
// TIER 4 — TRUSTING: "I can be myself" (Casts 7–8)
// ============================================================

=== fugu_t4_c7_b1 ===
...
...
...
...

* [WAIT] #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.fugu.first_silence
    ...
    ...
    ...
    You know what we're doing right now?
    ...
    We're being silent. Together.
    ...
    I've never done this.
    Never.
    ...
    Usually silence is when I'm alone.
    And it hurts.
    But right now... it's soft.
    ...
    Is this what friendship is? This kind of silence?
    -> fugu_t4_c7_b2

* [TWITCH] #delta:2 #expr:curious #icon:curiosity #drift:WARM
    Oh! Sorry! I was trying to... say nothing.
    ...
    It's an exercise. For me.
    ...
    Being silent. Not from loneliness.
    By choice.
    ...
    It's hard. But with you it's... possible.
    -> fugu_t4_c7_b2

* [DRIFT] #delta:0 #expr:neutral #icon:hesitation #drift:NEUTRAL
    ...
    No wait!
    ...
    I was trying something new.
    Silence.
    On purpose.
    ...
    It's ruined now right?
    -> fugu_t4_c7_b2

* [REEL] #delta:-2 #expr:alarmed #icon:sadness #drift:WARY
    ...
    I was being vulnerable there.
    Silence is... my armor off.
    ...
    And you pick this moment to...
    ...no. No.
    -> fugu_t4_c7_b2


=== fugu_t4_c7_b2 ===
I'm gonna tell you something.
...
The biggest secret.
...
I control my spines now.
Completely.
...
I've been training for three nights.
So I could...
...
*extends a fin, spines perfectly retracted*
...
So I could do this.
Without danger.
For the first time in my life.

* [WAIT] #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:secret.fugu.full_control #flag:mood.fugu.touch_possible
    ...
    You understand what this means?
    ...
    It means someone could...
    ...
    Well. Theoretically.
    ...
    Just... stay close to me.
    Without risk.
    ...
    For the first time.
    ...
    Trust me.
    -> END

* [TWITCH] #delta:3 #expr:warm #icon:delight #drift:CHARMED
    You wanna touch?! REALLY?!
    ...
    Wait! Wait!
    *concentrates very hard*
    ...
    Ok. Go ahead. Gently.
    ...
    ...
    SEE?! Nothing! No spines!
    ...
    *tears, of joy*
    -> END

* [DRIFT] #delta:0 #expr:neutral #icon:hesitation #drift:NEUTRAL
    ...
    It's fine if you don't want to.
    ...
    The fact that I learned... that's already...
    ...
    That's already for me.
    -> END

* [REEL] #delta:-2 #expr:alarmed #icon:sadness #drift:WARY
    No! Not like that!
    ...
    I did all this so I could CHOOSE.
    Not so someone could take me.
    ...
    You understand the difference?
    -> END


=== fugu_t4_c8_b1 ===
Hey.
...
I wanted to tell you something.
Seriously.
No joke. No crazy energy.
Just... the true thing.
...
You're my friend.
...
My first friend.
The first real one.
Not a snail. Not a rock. Not an imaginary one.
A real one.
...
You.

* [WAIT] #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.fugu.said_friend #flag:fact.fugu.dream
    ...
    ...
    There.
    It's said.
    ...
    It took my whole life to say that to someone.
    And now it's said.
    ...
    And you're staying.
    -> fugu_t4_c8_b2

* [TWITCH] #delta:4 #expr:warm #icon:delight #drift:CHARMED #flag:fact.fugu.dream
    Ha! You... you're doing the joy dance too?!
    ...
    No? Just me?
    ...
    Doesn't matter! I'M doing the joy dance!
    *puffs up and deflates rapidly*
    FRIENDS! We're FRIENDS! Trust me!
    -> fugu_t4_c8_b2

* [DRIFT] #delta:-1 #expr:neutral #icon:sadness #drift:TROUBLED
    ...you're drifting away?
    Now?
    ...
    I just said the most important thing of my life and you...
    ...
    No. It's ok. People do that.
    They pull away when it's too much.
    ...
    Come back when you're ready.
    -> fugu_t4_c8_b2

* [REEL] #delta:-3 #expr:alarmed #icon:shock #drift:SCARED
    ...
    ...that's not how friendship works.
    ...
    Friendship isn't grabbing.
    It's... staying. Just staying.
    ...
    You understand?
    -> fugu_t4_c8_b2


=== fugu_t4_c8_b2 ===
I have a dream.
...
It's silly. It's a little kid's dream.
...
I want a friend who stays.
Even knowing everything.
The spines. The poison. The fact that I talk too much.
The fact that I cry at night.
...
Who stays anyway.
...
And comes back the next day.
...
You do that.
You do exactly that.
...
Trust me. It's more than I deserve.

* [WAIT] #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.fugu.dream_fulfilled #flag:fact.fugu.dream
    ...
    ...
    *little bubbles rising*
    ...
    Those are happy tears.
    Just to be clear.
    Pufferfish cry with bubbles.
    ...
    Well I think. I'd never cried from happiness before.
    -> END

* [TWITCH] #delta:3 #expr:warm #icon:delight #drift:CHARMED #flag:fact.fugu.dream
    More than you deserve?! NO!
    ...
    You deserve a million friends!
    Two million!
    ...
    But I'm glad to be the first.
    Trust me.
    -> END

* [DRIFT] #delta:0 #expr:neutral #icon:hesitation #drift:NEUTRAL
    ...
    You'll come back tomorrow?
    ...
    Tell me you'll come back tomorrow.
    ...
    Please.
    -> END

* [REEL] #delta:-2 #expr:alarmed #icon:sadness #drift:WARY #flag:fact.fugu.dream
    ...
    See that's exactly it.
    ...
    I give you everything and you want to take even more.
    ...
    Friendship isn't taking. It's giving.
    ...
    Think about it.
    -> END


// ============================================================
// TIER 5 — BONDED: "True friendship" (Casts 9–10)
// ============================================================

=== fugu_t5_c9_b1 ===
...
I'm gonna tell you something.
...
I counted.
You've come back... a lot of times.
Every time I count.
...
And every time, the morning before you arrive...
My heart beats faster.
...
Not from fear.
From... what actually?
...
Hope I think.
For the first time in my life.
Hope.

* [WAIT] #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.fugu.hope
    ...
    ...
    Do you know what it feels like to hope after a whole life without hope?
    ...
    It's terrifying.
    And beautiful.
    ...
    Both at the same time.
    ...
    You gave me that.
    -> fugu_t5_c9_b2

* [TWITCH] #delta:3 #expr:warm #icon:delight #drift:CHARMED
    Ha! My heart's doing the thing again! Right now!
    ...
    *puffs up very slightly*
    Don't panic! It's JOY!
    Just joy!
    ...
    Controlled! See? I'm in control!
    -> fugu_t5_c9_b2

* [DRIFT] #delta:0 #expr:neutral #icon:hesitation #drift:NEUTRAL
    ...
    You're leaving already?
    ...
    No it's ok.
    You always come back.
    I know that now.
    ...
    I trust you.
    -> fugu_t5_c9_b2

* [REEL] #delta:-2 #expr:alarmed #icon:sadness #drift:WARY
    ...
    Not now.
    ...
    Not when I'm like this. Open.
    ...
    Please.
    -> fugu_t5_c9_b2


=== fugu_t5_c9_b2 ===
...
Fugu isn't my real name.
...
My real name is the one my family gave me.
Before they left.
...
But Fugu is the name I chose for myself.
Because it's what I am.
A pufferfish.
Dangerous on the outside.
...
But on the inside...
...
Just a little fish who wants to be loved.
...
There. Now you know everything.
Absolutely everything.

* [WAIT] #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:secret.fugu.knows_all #flag:fugu.catch_available
    ...
    ...
    Thank you.
    ...
    For everything.
    For every visit. Every silence. Every game.
    ...
    You're the best thing that ever happened to me.
    Trust me.
    -> END

* [TWITCH] #delta:3 #expr:warm #icon:delight #drift:CHARMED #flag:fugu.catch_available
    Ha! You're dancing for me?!
    ...
    I'm dancing too! LOOK!
    *puffs up and deflates in rhythm*
    ...
    Haha! We're ridiculous!
    ...
    I love being ridiculous with you.
    -> END

* [DRIFT] #delta:0 #expr:neutral #icon:hesitation #drift:NEUTRAL #flag:fugu.catch_available
    ...
    You'll come back?
    ...
    Ok.
    ...
    I know you will.
    -> END

* [REEL] #delta:-2 #expr:alarmed #icon:sadness #drift:WARY #flag:fugu.catch_available
    ...
    Now you know everything.
    And you still want to take.
    ...
    At least be honest with yourself about what you're doing.
    -> END


=== fugu_t5_c10_b1 ===
...
You're here.
...
Today is... different.
I can feel it.
...
You know...
If you take me...
I'll be with you forever.
That's what I want, trust me!
...
But... but if you let me go...
I'll swim knowing I had a friend.
A real one.
...
So... what do you choose?

* [WAIT] #delta:3 #expr:warm #icon:warmth #drift:CHARMED
    ...
    ...
    You're taking your time.
    ...
    That's good. It's a big choice.
    For both of us.
    ...
    Whatever you decide... it was good.
    All of it. It was good.
    Trust me.
    -> END

* [TWITCH] #delta:2 #expr:curious #icon:curiosity #drift:WARM
    Ha! Still playing?
    ...
    Even now. Even at the end.
    ...
    That's why you're my friend.
    -> END

* [DRIFT] #delta:1 #expr:warm #icon:hesitation #drift:WARM
    ...
    You're drifting away gently.
    ...
    That's... that's your answer?
    ...
    ...ok.
    -> END

* [REEL] #delta:0 #expr:warm #icon:surprise #drift:CHARMED
    ...
    You're choosing.
    ...
    Ok.
    ...
    I'm ready.
    -> END

`;
