# App Promotion Token Service Plan

## 1. Project Summary

This project is a web-based app promotion platform that uses a free airdrop token as a visitor acquisition and engagement mechanism.

The original goal is:

- Bring users to the website through free token airdrops.
- Show promoted apps to those visitors.
- Let app developers use tokens to request app exposure inside the website.
- Avoid high-risk financial, exchange, custody, and investment-like structures.

This service is not an app. It is a website.

## 2. Core Positioning

Recommended positioning:

> A web platform where users receive free participation tokens by visiting the site, and app developers can use tokens to request app exposure inside the platform.

Avoid positioning it as:

- A crypto investment project.
- A token price appreciation project.
- A DEX-linked token economy.
- A paid install or incentivized app download network.
- A token exchange, wallet custody, or financial service.

## 3. Important Risk Boundaries

The service should be designed to avoid the following high-risk behaviors.

### 3.1 Do Not Provide Crypto Financial Functions

Do not implement:

- Token sale by the platform.
- Token-to-cash exchange.
- Token-to-point exchange.
- Token-to-crypto swap.
- DEX swap button.
- DEX liquidity guidance.
- Token price chart.
- Token market cap display.
- Token investment return language.
- User token custody by the service.
- Private key custody by the service.
- Deposit/withdrawal account system controlled by the service.

### 3.2 Do Not Promote Investment Expectations

Avoid copy such as:

- "This token may rise in value."
- "Buy before it goes up."
- "Token demand will increase as app promotion grows."
- "Token holders benefit from platform growth."
- "Listed on DEX."
- "Earn money by visiting."

Recommended copy:

- "Tokens are free participation rewards."
- "Tokens are used for community functions inside this website."
- "Tokens do not guarantee monetary value."
- "This service does not provide exchange, custody, or investment services."

### 3.3 Avoid Incentivized Store Manipulation

Do not reward:

- Google Play or App Store reviews.
- Star ratings.
- Positive reviews.
- App installs as the sole task.
- App execution as the sole task.
- Paid purchases.
- Ad watching inside promoted apps.
- Account registration inside promoted apps.

If app testing is introduced later, reward only useful feedback, bug reports, UX reports, or structured surveys, not install count itself.

## 4. Token Economy Design

The token must have a real internal use, otherwise users have no reason to collect it.

The safest usable model is:

> Free token airdrop + token escrow for app exposure requests + approval-based token consumption.

### 4.1 Token Earning

Users can earn tokens through:

- Daily site check-in.
- Limited-time visit event.
- Campaign page participation.
- App discovery page visit.
- Useful app feedback, if this feature is added later.
- Bug or spam report accepted by moderators.

Avoid creating a loop where users are directly paid to install apps.

### 4.2 Token Spending

Developers can use tokens for:

- App exposure request.
- Category page exposure request.
- "Today's App" candidate request.
- Newsletter feature candidate request.
- App detail page highlight request.
- Feedback request priority, if feedback features are added.

Important:

- Token use should not automatically guarantee exposure unless the product is clearly defined and moderation is passed.
- For trust, tokens should be escrowed first and consumed only after approval.

## 5. Token Escrow Flow

Never burn or consume tokens immediately when a developer submits a request.

Recommended flow:

1. Developer submits an app exposure request.
2. Required tokens are locked in escrow.
3. Moderator reviews the app and request.
4. If approved, exposure starts and tokens are consumed.
5. If rejected, tokens are returned.
6. If not reviewed within a fixed time, tokens are automatically returned.

Suggested review timeout:

- 48 hours for normal exposure requests.
- 72 hours for newsletter or editorial requests.

### 5.1 Token Handling Rules

| Situation | Token Handling |
|---|---|
| Approved and exposure starts | Consume token |
| Rejected by moderator | Return full token |
| Review timeout | Return full token automatically |
| Invalid app link | Return full token |
| App violates policy | Return full token or partial penalty |
| Repeated spam submission | Partial penalty or account restriction |
| False app information | Penalty possible |
| Exposure stopped due to later report | Return unused period proportionally |

## 6. App Promotion Products

Initial promotion products should be simple and transparent.

| Product | Example Cost | Review Needed | Token Handling |
|---|---:|---|---|
| App detail page highlight 24h | 50 tokens | Yes | Consume after approval |
| Category page featured slot 12h | 120 tokens | Yes | Consume after approval |
| Main page app candidate | 200 tokens | Yes | Consume only if selected |
| Newsletter feature candidate | 300 tokens | Yes | Consume only if selected |
| Feedback request priority | 100 tokens | Yes | Consume after approval |

Do not call this "advertising purchase" in the first version. Use softer language:

- Exposure request
- Feature request
- Highlight request
- Promotion slot request
- App discovery boost

## 7. MVP Feature Scope

### 7.1 User Features

- Google login.
- Wallet address registration or wallet connection.
- Daily check-in.
- Token airdrop claim.
- Token balance display.
- Token transaction history.
- App discovery page.
- App detail page.
- App save/favorite.

### 7.2 Developer Features

- Register app.
- Verify app ownership if possible.
- Edit app profile.
- Submit exposure request.
- View request status.
- View token escrow status.
- View basic exposure report.

### 7.3 Admin Features

- App approval queue.
- Exposure request review queue.
- Approve/reject/refund requests.
- Spam report management.
- Token event configuration.
- Manual token adjustment log.
- Suspicious activity dashboard.

## 8. Recommended User Flow

### 8.1 Visitor Flow

1. User visits the website.
2. User signs in with Google.
3. User registers or connects a wallet.
4. User claims daily free token.
5. User browses promoted apps.
6. User optionally saves apps or leaves feedback.

### 8.2 Developer Flow

1. Developer signs in.
2. Developer registers app.
3. Developer earns or receives tokens through participation.
4. Developer submits app exposure request.
5. Tokens are escrowed.
6. Admin approves or rejects.
7. If approved, exposure starts and tokens are consumed.
8. Developer sees basic performance report.

## 9. Data Model Draft

### 9.1 User

- id
- google_account_id
- email
- display_name
- role: user / developer / admin
- wallet_address
- created_at
- last_login_at
- status

### 9.2 App

- id
- owner_user_id
- app_name
- platform: android / ios / web
- store_url
- package_name_or_bundle_id
- category
- target_country
- short_description
- long_description
- screenshots
- icon_url
- status: draft / pending / approved / rejected / suspended
- created_at
- updated_at

### 9.3 TokenLedger

- id
- user_id
- amount
- direction: credit / debit / escrow_lock / escrow_release / escrow_consume
- reason
- related_entity_type
- related_entity_id
- tx_hash, if on-chain
- created_at

### 9.4 ExposureRequest

- id
- app_id
- user_id
- product_type
- token_amount
- status: pending / approved / rejected / expired / running / completed / cancelled
- escrow_ledger_id
- review_deadline_at
- reviewed_by
- reviewed_at
- rejection_reason
- exposure_start_at
- exposure_end_at
- created_at

### 9.5 ExposureReport

- id
- exposure_request_id
- impressions
- clicks
- saves
- outbound_store_clicks
- feedback_count
- created_at

## 10. Anti-Abuse Rules

This service will be vulnerable to farming if token claims are too easy.

Recommended defenses:

- One daily check-in per account.
- Device/browser fingerprint risk score.
- Rate limiting.
- IP risk scoring.
- Wallet address uniqueness check.
- Google account age or trust check, if available.
- CAPTCHA for suspicious traffic.
- Delayed token claim for new accounts.
- Manual review for large token usage.
- Suspicious account token freeze.

Avoid being too strict in the MVP, but log everything.

## 11. Legal and Policy Positioning Notes

This is not legal advice. Before public launch, consult a Korean lawyer familiar with virtual assets and platform regulation.

The design should emphasize:

- Tokens are free participation rewards.
- Tokens are not sold by the platform.
- Tokens are not exchangeable for cash by the platform.
- Tokens are not exchangeable for points by the platform.
- The platform does not custody user assets.
- The platform does not provide swap, exchange, brokerage, or investment services.
- The platform does not guarantee token value.
- Token use inside the site is limited to community/promotional request features.

Potentially important legal question for counsel:

> If a website freely airdrops a token as a participation reward, does not sell it, does not provide custody, does not provide exchange/swap/brokerage, and only allows token escrow for app exposure requests inside the website, is this likely to be considered a virtual asset service provider activity in Korea?

## 12. Terms and UI Copy Draft

Use clear language in the UI.

### 12.1 Token Notice

Tokens are free participation rewards provided by this website.
Tokens do not guarantee monetary value.
This website does not provide token sale, exchange, custody, or investment services.

### 12.2 Exposure Request Notice

Tokens submitted for exposure requests are locked in escrow during review.
If the request is rejected or not reviewed within the review period, the locked tokens are returned.
Tokens are consumed only after the request is approved and exposure begins.

### 12.3 App Promotion Policy

This website does not reward users for app store reviews, star ratings, or positive comments.
Promotion requests may be rejected if the app is misleading, harmful, illegal, spam-like, or violates platform policy.

## 13. MVP Build Order

Recommended build sequence:

1. Landing page.
2. Google login.
3. App registration.
4. App listing and detail pages.
5. Wallet address registration.
6. Off-chain token balance ledger first.
7. Daily check-in and token credit.
8. Exposure request with escrow state.
9. Admin approval/rejection.
10. Featured app slot rendering.
11. Basic exposure report.
12. Optional on-chain token claim integration.

Important recommendation:

Start with an off-chain ledger for MVP simulation. Add real on-chain token only after the core loop is validated.

## 14. Success Metrics

Validate the model before building complex token infrastructure.

### 14.1 2-Week MVP Metrics

- 100 registered users.
- 30 registered apps.
- 20 exposure requests.
- 10 repeat developers.
- 500 daily check-ins total.
- 5 developers saying they would keep using it.

### 14.2 Kill Criteria

Consider dropping or pivoting if:

- Users only claim tokens and do not browse apps.
- Developers do not submit exposure requests.
- Exposure does not create meaningful app clicks.
- Abuse/farming dominates real usage.
- Token expectation becomes mostly speculative.

## 15. Final Recommended Direction

The most balanced version is:

> Free daily token airdrop + app discovery website + token escrow for app exposure requests + no custody/exchange/sale/DEX/price promotion.

This preserves the token-driven acquisition engine while avoiding the highest-risk structures.

The most dangerous version is:

> Token sale + DEX promotion + token price narrative + token-for-advertising purchase + app install rewards + token/point exchange.

Do not build that version without formal legal review.
