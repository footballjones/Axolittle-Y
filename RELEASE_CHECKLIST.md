# Release Readiness Checklist for Axolittle

## 🎮 Core Gameplay (Status: ✅ Mostly Complete)

### Completed ✅
- [x] All 8 mini-games implemented
- [x] Energy system working
- [x] XP/Level progression system
- [x] Wellbeing stats (hunger, happiness, cleanliness, water quality)
- [x] Life stages (Baby → Juvenile → Adult → Elder)
- [x] Rebirth system with eggs
- [x] Breeding system with eggs
- [x] Recessive genes system
- [x] Egg incubation and hatching
- [x] Shop system (decorations, filters, food)
- [x] Shrimp/vacation system
- [x] Filter upgrades affecting water quality decay

### Needs Work ⚠️
- [ ] **Balance tuning**: Score thresholds, XP rewards, coin amounts (currently placeholders)
- [ ] **Energy regen rate**: Currently 1/hour placeholder - needs real tuning
- [ ] **Filter decay multipliers**: Implement actual 40%/70% slowdown (currently just placeholder)
- [ ] **Water change cooldown**: Design doc says "locks mini games for 2 hours" - not implemented

---

## 💰 Monetization & Engagement (Status: ❌ Missing)

### Critical for Release
- [ ] **Rewarded ads system**: 
  - Watch ad → earn 2-3 Opals
  - Max 5 per day
  - Opt-in only (never forced)
  - Integration with AdMob or similar
  
- [ ] **Daily spin wheel**:
  - One free spin per day
  - Rewards: Coins (most), Opals (rare)
  - Visual wheel component
  - Daily reset logic
  
- [ ] **Daily login bonus**:
  - Small coin reward for opening app
  - Login streak tracking (7, 30, 100 days)
  - Streak milestone rewards (Opals)
  
- [ ] **In-App Purchases (IAP)**:
  - Real payment integration (StoreKit for iOS)
  - Opal purchase packs
  - Receipt validation
  - Restore purchases functionality

### Nice to Have
- [ ] **Achievement system**: 
  - Track milestones (first meal, first evolution, etc.)
  - Award Opals for achievements
  - Achievement UI/notifications
  
- [ ] **Exceptional performance Opal drops**: 
  - Already implemented in minigames (10% chance)
  - May need tuning

---

## 🎨 App Store Requirements (Status: ❌ Not Started)

### Required Assets
- [ ] **App icons**: 
  - All required sizes (1024x1024 for App Store, various device sizes)
  - Design per Apple guidelines
  
- [ ] **Launch screen**: 
  - Splash screen for iOS
  - Should match game aesthetic
  
- [ ] **Screenshots**: 
  - iPhone screenshots (6.7", 6.5", 5.5" displays)
  - iPad screenshots (if supporting iPad)
  - Show key features (aquarium, mini-games, shop)
  
- [ ] **App preview video** (optional but recommended):
  - 15-30 second gameplay video
  
- [ ] **App Store metadata**:
  - App name, subtitle, description
  - Keywords for search
  - Age rating (likely 4+)
  - Privacy policy URL
  - Support URL

---

## 🔧 Technical Requirements (Status: ⚠️ Partial)

### iOS Integration
- [x] iOS wrapper code created
- [ ] **Xcode project setup**: Create actual project
- [ ] **Device testing**: Test on real iOS devices
- [ ] **Performance optimization**: 
  - Memory usage
  - Frame rate (60fps target)
  - Battery usage
  - Load times
  
- [ ] **Error handling**: 
  - Network errors (if backend added)
  - Storage errors
  - Graceful degradation

### Backend Services (If Real Multiplayer)
- [ ] **User accounts**: 
  - Registration/login
  - Cloud save sync
  - Cross-device play
  
- [ ] **Friend system**: 
  - Real friend connections (not mock)
  - Friend codes/username system
  - Friend profiles
  
- [ ] **Breeding with friends**: 
  - Real-time breeding requests
  - Notification system
  - Egg gifting
  
- [ ] **Leaderboards**: 
  - Mini-game scores
  - Stat comparisons

### Analytics & Monitoring
- [ ] **Analytics integration**: 
  - Firebase Analytics, Mixpanel, or similar
  - Track: sessions, retention, monetization events
  - Crash reporting (Crashlytics, Sentry)
  
- [ ] **A/B testing framework**: 
  - For balancing (score thresholds, rewards)
  - For monetization (pricing, ad frequency)

---

## 🐛 Testing & Quality Assurance (Status: ⚠️ Needs Work)

### Functional Testing
- [ ] **Full game flow testing**:
  - Complete lifecycle: Welcome → Baby → Elder → Rebirth
  - All 8 mini-games tested
  - All shop purchases tested
  - Egg hatching flow tested
  
- [ ] **Edge case testing**:
  - What happens if energy is 0?
  - What if localStorage is full?
  - What if app is closed during mini-game?
  - What if device runs out of storage?
  
- [ ] **Device compatibility**:
  - Test on iPhone SE (small screen)
  - Test on iPhone Pro Max (large screen)
  - Test on iPad (if supporting)
  - Test on older iOS versions (13.0+)

### Performance Testing
- [ ] **Memory profiling**: 
  - Check for memory leaks
  - Long play session testing (1+ hours)
  
- [ ] **Battery usage**: 
  - Monitor battery drain
  - Optimize animations/rendering
  
- [ ] **Load time**: 
  - First launch time
  - Game state load time
  - Mini-game load times

### User Testing
- [ ] **Beta testing**: 
  - TestFlight beta release
  - Gather feedback from target age group (7-14 year olds)
  - Parent feedback (safety, appropriateness)
  
- [ ] **Usability testing**:
  - Can kids navigate without help?
  - Are instructions clear?
  - Is the UI intuitive?

---

## 📋 Legal & Compliance (Status: ❌ Not Started)

### Required
- [ ] **Privacy Policy**: 
  - What data is collected (analytics, IAP)
  - How data is used
  - COPPA compliance (under 13)
  - Host on website, link in App Store
  
- [ ] **Terms of Service**: 
  - User agreements
  - In-app purchase terms
  
- [ ] **Age Rating**: 
  - Submit to App Store
  - Likely 4+ (family-friendly)
  
- [ ] **COPPA Compliance** (if targeting under 13):
  - Parental consent flow
  - Limited data collection
  - No behavioral advertising

---

## 🎯 Content & Polish (Status: ⚠️ Partial)

### Content
- [x] All mini-games implemented
- [x] Core gameplay complete
- [ ] **Tutorial improvements**: 
  - Interactive tutorial (not just "How to Play" text)
  - First-time user onboarding
  
- [ ] **Help system**: 
  - In-game help/tips
  - FAQ section
  
- [ ] **Achievement descriptions**: 
  - Clear achievement text
  - Visual achievement badges

### Polish
- [ ] **Animation polish**: 
  - Smooth transitions
  - Loading states
  - Error states
  
- [ ] **Sound effects** (optional):
  - Button clicks
  - Game sounds
  - Ambient aquarium sounds
  
- [ ] **Music** (optional):
  - Background music
  - Theme variations
  
- [ ] **Visual polish**: 
  - Consistent spacing
  - Loading indicators
  - Empty states
  - Error messages

---

## 🔄 Missing Features from Design Docs

### High Priority
- [ ] **Daily spin wheel** (mentioned in Currency & Monetization)
- [ ] **Daily login bonus** (mentioned in Currency & Monetization)
- [ ] **Rewarded ads** (mentioned in Currency & Monetization)
- [ ] **Achievement system** (mentioned in Achievements & Notifications doc)
- [ ] **Water change cooldown** (locks mini-games for 2 hours per Aquarium System doc)

### Medium Priority
- [ ] **Friend code system**: Real friend codes (not just mock)
- [ ] **Egg gifting**: Real gifting to friends (currently placeholder)
- [ ] **Nursery slot unlocking**: Purchase additional slots with Opals
- [ ] **Multiple aquarium slots**: Support for multiple axolotls (future feature)

### Low Priority (Future Updates)
- [ ] **Real multiplayer**: Replace bots with real players
- [ ] **Cloud save**: Sync across devices
- [ ] **Push notifications**: Reminders, friend requests
- [ ] **Social sharing**: Share achievements, axolotl photos

---

## 📊 Prioritized Release Roadmap

### Phase 1: Core Release (MVP) - 2-3 weeks
**Must have for initial release:**
1. ✅ Core gameplay (DONE)
2. ⚠️ Balance tuning (score thresholds, rewards)
3. ❌ Daily spin wheel
4. ❌ Daily login bonus
5. ❌ Rewarded ads integration
6. ❌ Real IAP integration
7. ❌ App Store assets (icons, screenshots)
8. ❌ Privacy policy
9. ⚠️ Device testing and bug fixes
10. ⚠️ Performance optimization

### Phase 2: Engagement Features - 1-2 weeks
**Improve retention:**
1. Achievement system
2. Login streaks
3. Tutorial improvements
4. Analytics integration

### Phase 3: Social Features - 2-3 weeks
**Real multiplayer:**
1. Backend services
2. User accounts
3. Real friend system
4. Real breeding/gifting

---

## 🚀 Immediate Next Steps (This Week)

1. **Set up Xcode project** and test on device
2. **Implement daily spin wheel** (high engagement feature)
3. **Implement daily login bonus** (retention hook)
4. **Balance tuning**: Play test and adjust score thresholds
5. **Create app icons** (can use placeholder initially)
6. **Write privacy policy** (required for App Store)

---

## 📝 Notes

- **Mock features**: Friend system, breeding, and gifting currently use mock data. For MVP release, these can stay mock if real backend isn't ready.
- **Balance values**: All score thresholds and rewards are placeholders. Need playtesting to tune.
- **Energy regen**: Currently 1/hour - needs real testing to determine appropriate rate.
- **Filter effects**: Need to implement actual decay multipliers (40% and 70% slowdown).

---

## 🎯 Release Criteria

**Minimum Viable Product (MVP) for App Store:**
- ✅ All core gameplay working
- ⚠️ Balance tuned (playtested)
- ❌ Daily engagement features (spin wheel, login bonus)
- ❌ Rewarded ads working
- ❌ IAP working (even if just test mode)
- ❌ App Store assets complete
- ❌ Privacy policy published
- ⚠️ Tested on real devices
- ⚠️ No critical bugs

**Full Release:**
- All MVP items ✅
- Achievement system
- Real friend system (or polished mock)
- Analytics integrated
- Performance optimized
- Beta tested with target audience
