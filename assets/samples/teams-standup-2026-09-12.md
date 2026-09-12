# Auth Service — Daily Standup

Microsoft Teams meeting transcript
Date: 2026-09-12 · 09:00–09:14 (14 min)
Attendees: Priya Nair (EM), Dana Okafor (Backend), Sam Reyes (Mobile), Marco Bianchi (SRE)

---

[09:00] Priya Nair: Morning everyone. Coffee's terrible today but let's get going. Quick one — mostly the login incident follow-up.

[09:01] Marco Bianchi: Morning. So on the incident: the rollback we tried last night did not fix the intermittent 401s. Error rate was still around four percent after we reverted.

[09:01] Priya Nair: Right, so a rollback is off the table as the fix. Marco, what's your read on root cause?

[09:02] Marco Bianchi: It's the stateless JWTs. When we revoke a token we can't actually invalidate it before it expires, so a compromised session lingers. And clock skew across the new regions is making short-lived tokens flap.

[09:03] Dana Okafor: I've been saying this for a while. If we held session state server-side we could revoke instantly and stop leaning on token expiry for security.

[09:04] Priya Nair: Okay. Let's make the call: we're moving Auth Service off stateless JWTs to server-side sessions. That's the direction. Any objection?

[09:04] Marco Bianchi: None from SRE. It fixes revocation and the skew problem.

[09:05] Dana Okafor: Works for me. For the store, I'd put sessions in Redis — we already run a cluster for rate limiting, low latency, and it gives us TTL for free.

[09:05] Priya Nair: Good. Decision two then: sessions live in Redis, and we set the idle session timeout to thirty minutes. Everyone okay with thirty?

[09:06] Marco Bianchi: Thirty is fine. Matches the SSO provider's default.

[09:06] Priya Nair: Then that's settled. Dana, can you take the migration end to end?

[09:07] Dana Okafor: Yep, I'll own the session-store migration. I'll aim to have it behind a flag in staging by end of sprint, so Friday the twenty-fifth.

[09:07] Priya Nair: Perfect, thank you. Sam, anything from mobile?

[09:08] Sam Reyes: One thing I don't have an answer to. If a user backgrounds the app for a few days, the session will have expired server-side. How should the mobile client refresh — do we issue a long-lived refresh credential, force a re-login, or something in between? I don't want to guess at the security tradeoff.

[09:09] Priya Nair: That's a real open question and I don't want to hand-wave it. Let's leave it open and pull in security before we decide the mobile refresh flow.

[09:09] Sam Reyes: Sounds good, I'll write up the options.

[09:10] Marco Bianchi: Quick status while we're here — staging is green again after this morning's deploy, and the dashboards are back. Nothing on fire.

[09:11] Priya Nair: Great. Oh, and someone snagged the last oat milk in the kitchen, if that was you, I salute you.

[09:11] Dana Okafor: No comment.

[09:12] Priya Nair: Ha. Okay — decisions are: off JWTs to server-side sessions, Redis store with a thirty-minute idle timeout. Dana owns the migration, flagged in staging by the twenty-fifth. Mobile refresh is open pending security. That's it, thanks all.

[09:12] Sam Reyes: Thanks everyone.

[09:13] Marco Bianchi: Cheers.
