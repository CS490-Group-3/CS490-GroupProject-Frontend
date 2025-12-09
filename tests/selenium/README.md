# Selenium Test Suite for Salonica

Comprehensive automated testing for the Salonica salon booking platform.

## Test Coverage

This test suite covers **6 main test flows** across all user roles:

| Test | Description | User Role |
|------|-------------|-----------|
| Test 1 | Authentication, Profile Update & Loyalty | Customer |
| Test 2 | Complete Booking Flow (with date selection) | Customer |
| Test 3 | Salon Registration, Admin Approval & Setup | Owner + Admin |
| Test 4 | Loyalty Program Configuration | Owner |
| Test 5 | Barber Schedule Management | Barber |
| Test 6 | Admin Features (all tabs) | Admin |

---

## User Stories Tested

### ✅ FEATURES TESTED (18 Features)

#### Authentication & Registration
| # | User Story | Test |
|---|------------|------|
| 1 | As a user, I want to log in securely so that I can manage my appointments and data. | Test 1, 2, 3, 4, 5, 6 |
| 2 | As a salon owner, I want to register my salon so that I can list it on the platform. | Test 3 |
| 3 | As an admin, I want to verify salon registrations so that only legitimate businesses are listed. | Test 3 |

#### Booking & Appointments
| # | User Story | Test |
|---|------------|------|
| 4 | As a user, I want to browse available salons so that I can choose where to book. | Test 2 |
| 5 | As a user, I want to view available barbers and time slots so that I can book easily. | Test 2 |
| 6 | As a user, I want to reschedule my appointment so that I can adjust my plans. | Test 2 |
| 7 | As a user, I want to cancel an appointment so that I don't take up unnecessary slots. | Test 2 |

#### Barber Schedule
| # | User Story | Test |
|---|------------|------|
| 8 | As a barber, I want to view my daily schedule so that I can prepare in advance. | Test 5 |
| 9 | As a barber, I want to block unavailable time slots so that customers don't book them. | Test 5 |

#### Payments
| # | User Story | Test |
|---|------------|------|
| 10 | As a user, I want to pay securely online so that I don't need cash. | Test 2 |

#### Loyalty Program
| # | User Story | Test |
|---|------------|------|
| 11 | As a user, I want to view my loyalty points balance so that I know my rewards progress. | Test 1 |
| 12 | As a user, I want to redeem loyalty points for discounts so that I can save money. | Test 2 |
| 13 | As a salon owner, I want to configure loyalty rewards so that I can attract repeat customers. | Test 4 |

#### Admin Analytics & Monitoring
| # | User Story | Test |
|---|------------|------|
| 14 | As an admin, I want to see user engagement stats so that I can monitor platform usage. | Test 6 (Dashboard) |
| 15 | As an admin, I want to see appointment trends so that I can identify peak hours. | Test 6 (Analytics) |
| 16 | As an admin, I want to track salon revenues so that I can analyze performance. | Test 6 (Analytics) |
| 17 | As an admin, I want to monitor loyalty program usage so that I can measure effectiveness. | Test 6 (Analytics) |
| 18 | As an admin, I want to monitor platform uptime and errors so that I can ensure reliability. | Test 6 (Health/Monitor) |

### ❌ FEATURES NOT TESTED (16 Features)

| # | User Story | Reason |
|---|------------|--------|
| 1 | As a user, I want to sign up with an email and password | Login tested, but not new signup flow |
| 2 | As a user, I want to receive reminders before my appointment | Notifications not tested |
| 3 | As a salon owner, I want to track payments | Payments page not navigated |
| 4 | As a user, I want to earn loyalty points for each visit | Points earning not verified |
| 5 | As a salon owner and user I want to save/view before-after images | Not implemented in tests |
| 6 | As a user, I want to view my visit history | Not tested |
| 7 | As a salon owner, I want to see customer visit histories | Not tested |
| 8 | As a user, I want to leave reviews for salons | Not tested |
| 9 | As a salon owner, I want to respond to reviews | Not tested |
| 10 | As a user, I want to get notifications about discounts | Not tested |
| 11 | As a salon owner, I want to send promotional offers | Not tested |
| 12 | As a Salon Owner I want to have an online shop | Not tested |
| 13 | As a user, I want to purchase items and add to cart | Not tested |
| 14 | As an admin, I want to visualize user demographics | Page navigated, not verified |
| 15 | As an admin, I want to see customer retention metrics | Page navigated, not verified |
| 16 | As an admin, I want to generate reports | Page navigated, not verified |

### 📊 COVERAGE SUMMARY

| Category | Tested | Not Tested | Total |
|----------|--------|------------|-------|
| Authentication & Registration | 3 | 1 | 4 |
| Booking & Appointments | 4 | 1 | 5 |
| Barber Schedule | 2 | 0 | 2 |
| Payments | 1 | 1 | 2 |
| Loyalty Program | 3 | 1 | 4 |
| Before/After Images | 0 | 1 | 1 |
| Visit History | 0 | 2 | 2 |
| Reviews | 0 | 2 | 2 |
| Notifications/Promotions | 0 | 2 | 2 |
| Online Shop | 0 | 2 | 2 |
| Admin Analytics | 5 | 3 | 8 |
| **TOTAL** | **18** | **16** | **34** |

**✅ 18 Features Tested (53% coverage of user stories)**

---

## Test Accounts

The following test accounts are used:

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@salonica.com` | `Ssssssss7` |
| Barber | `barber1atfadefactory@salonica.com` | `Ssssssss7` |
| Owner | `owner@salonica.com` | `Ssssssss7` |
| New Owner | `hifif37383@kudimi.com` | `TestOwner1` |
| Admin | `dadeha8177@izeao.com` | `Pass123123` |
| Unassigned Barber | `duo1xcv@nuoifb.com` | (for salon setup) |

## Setup Instructions

### 1. Install Python Dependencies
```bash
cd tests/selenium
pip install -r requirements.txt
```

### 2. Start Your Dev Server
```bash
# In your project root
npm run dev
```
The app should be running on `http://localhost:5173`

## Running Tests

### Run All Tests
```bash
cd tests/selenium
python test_comprehensive.py
```

### Run with Interactive Prompt
```bash
python run_all_tests.py
```

### Run with Pytest
```bash
pytest test_comprehensive.py -v
```

## Test Flow Details

### Test 1: Authentication, Profile & Loyalty
1. Invalid login attempt (should be rejected)
2. Valid customer login
3. Update profile last name
4. Check loyalty balance and claim rewards

### Test 2: Complete Booking Flow
1. Login as customer
2. Navigate to Browse Salons
3. Search for "Fade Factory"
4. Click on salon profile
5. Start booking wizard
6. Select barber (not Caleb)
7. Select service
8. **Select date/time** - if no slots available, automatically tries next day
9. Review appointment
10. Proceed to payment
11. Select saved payment method
12. Click Pay button
13. Reschedule the appointment
14. Cancel the appointment

### Test 3: Salon Registration & Verification
1. Login as new owner
2. Fill out salon registration form (name, address, phone, license)
3. Submit application
4. **Logout** and login as **Admin**
5. Navigate to Salon Verification
6. Click "Approve Application" → Click "Approve Salon" in dialog
7. **Logout** and login back as **Owner**
8. Navigate to Salon Setup page
9. **Save salon hours**
10. **Add a service** (Haircut, 30 min, $25)
11. **Add an employee** (search for unassigned barber)
12. **Assign "Haircut" service to the employee**
13. Verify owner dashboard is accessible

### Test 4: Loyalty Configuration
1. Login as owner
2. Navigate to Loyalty Program
3. Adjust loyalty settings
4. Save changes

### Test 5: Barber Schedule Management
1. Login as barber
2. Navigate to Schedule
3. Block time slots or interact with schedule

### Test 6: Admin Features (All Tabs)
1. Login as admin
2. Navigate to **Dashboard** - view platform metrics
3. Navigate to **Salon Verification** - view pending applications
4. Navigate to **Analytics** - view revenue/bookings
5. Navigate to **Audit Logs** - view activity logs
6. Navigate to **Platform Health** - view system status
7. Navigate to **Profile** - view admin profile

## Automatic Test Data Cleanup

The tests now include **automatic cleanup** that runs before each test suite. This removes all test salons and related data created by the test owner account.

### Setup for Automatic Cleanup

1. **Set environment variables** (get these from your backend `.env` file):
   ```bash
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_KEY="your-supabase-anon-key"
   ```

2. **Install cleanup dependency**:
   ```bash
   pip install supabase
   ```

3. **Run tests** - cleanup happens automatically:
   ```bash
   python test_comprehensive.py
   ```

The cleanup script will:
- Find all salons owned by the test owner (`hifif37383@kudimi.com`)
- Delete appointments, barber availability, services, and salon hours
- Unassign barbers from the salon
- Delete the salon itself

### Manual Cleanup (if automatic cleanup fails)

If automatic cleanup doesn't work, you can manually clean up:

#### Option 1: Run cleanup script directly
```bash
export SUPABASE_URL="your-supabase-url"
export SUPABASE_KEY="your-supabase-anon-key"
python cleanup_test_data.py
```

#### Option 2: Manual SQL cleanup
1. Find the test salon ID in Supabase Dashboard → `salons` table (look for "Test Salon XXXX")
2. Run these SQL queries (replace `YOUR_TEST_SALON_ID_HERE`):

```sql
-- Delete barber availability
DELETE FROM public.barber_availability
WHERE barber_id IN (
    SELECT id FROM public.barbers WHERE salon_id = 'YOUR_TEST_SALON_ID_HERE'
);

-- Delete appointments
DELETE FROM public.appointments
WHERE barber_id IN (
    SELECT id FROM public.barbers WHERE salon_id = 'YOUR_TEST_SALON_ID_HERE'
);

-- Unassign barbers
UPDATE public.barbers SET salon_id = NULL WHERE salon_id = 'YOUR_TEST_SALON_ID_HERE';

-- Delete services
DELETE FROM public.services WHERE salon_id = 'YOUR_TEST_SALON_ID_HERE';

-- Delete salon hours
DELETE FROM public.salon_hours WHERE salon_id = 'YOUR_TEST_SALON_ID_HERE';

-- Finally, delete the salon
DELETE FROM public.salons WHERE id = 'YOUR_TEST_SALON_ID_HERE';
```

## Common Issues & Fixes

### Tests Run Too Fast
Tests have built-in delays, but you can increase `time.sleep()` values for demo purposes.

### ChromeDriver Version Mismatch
The test uses `webdriver.Chrome()` which should auto-manage ChromeDriver. If issues occur:
```bash
pip install webdriver-manager
```

### No Time Slots Available
The test automatically clicks the next day on the calendar if no slots are available (up to 14 days ahead).

### Logout Not Working
The test clicks the "Logout" button in the header. If this fails, it falls back to clearing localStorage.

## Expected Output

```
======================================================================
🚀 SALONICA COMPREHENSIVE SELENIUM TEST SUITE
======================================================================
Testing: http://localhost:5173
======================================================================

📦 Running: Test 1: Auth, Profile & Loyalty
======================================================================
🧪 TEST 1: Authentication, Profile & Loyalty
============================================================

📍 Step 1: Invalid Login Attempt
✅ Invalid login correctly rejected

📍 Step 2: Valid Customer Login
✅ Logged in as customer
✅ Customer login successful

📍 Step 3: Update Profile Last Name
✅ Clicked Edit Profile button
✅ Entered new last name: TestUser1234
✅ Profile updated successfully

📍 Step 4: Check Loyalty Balance & Claim Reward
✅ Loyalty page loaded

✅ TEST 1 COMPLETE

... (Tests 2-6) ...

======================================================================
📊 FINAL TEST RESULTS
======================================================================
   Total Tests: 6
   ✅ Passed: 6
   ❌ Failed: 0
   Success Rate: 100.0%
======================================================================

🎉 ALL TESTS PASSED!
```

## File Structure

```
tests/selenium/
├── README.md              # This file
├── requirements.txt       # Python dependencies
├── test_comprehensive.py  # Main test suite (6 tests)
├── run_all_tests.py       # Test runner with prompts
└── test_license.txt       # Test license file for uploads
```
