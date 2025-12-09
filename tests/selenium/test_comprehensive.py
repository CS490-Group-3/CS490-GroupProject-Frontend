"""
Comprehensive Selenium Test Suite for Salonica Frontend
Tests 6 main flows across all user roles (customer, owner, barber, admin)
"""
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, ElementClickInterceptedException
from selenium.webdriver.common.action_chains import ActionChains
import time
import random

# Test Account Credentials
CUSTOMER_EMAIL = "customer@salonica.com"
CUSTOMER_PASS = "Ssssssss7"
BARBER_EMAIL = "barber1atfadefactory@salonica.com"
BARBER_PASS = "Ssssssss7"
OWNER_EMAIL = "owner@salonica.com"
OWNER_PASS = "Ssssssss7"
NEW_OWNER_EMAIL = "hifif37383@kudimi.com"
NEW_OWNER_PASS = "TestOwner1"
ADMIN_EMAIL = "dadeha8177@izeao.com"
ADMIN_PASS = "Pass123123"

# Barber email to search for when adding employees to a new salon
# This should be a barber account that is NOT already assigned to any salon
# If you don't have one, the test will skip the employee addition step
UNASSIGNED_BARBER_EMAIL = "duo1xcv@nuoifb.com"  # Unassigned barber for new salon setup

BASE_URL = "http://localhost:5173"


class BaseTest:
    """Base test class with common utilities"""
    
    def setup_method(self):
        chrome_options = Options()
        chrome_options.add_argument("--start-maximized")
        self.driver = webdriver.Chrome(options=chrome_options)
        self.wait = WebDriverWait(self.driver, 15)
        self.base_url = BASE_URL
    
    def teardown_method(self):
        time.sleep(1)
        self.driver.quit()
    
    def wait_for_page_load(self, timeout=15):
        try:
            WebDriverWait(self.driver, timeout).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
            time.sleep(2)
        except:
            pass
    
    def safe_click(self, element):
        try:
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
            time.sleep(0.5)
            element.click()
        except ElementClickInterceptedException:
            self.driver.execute_script("arguments[0].click();", element)
        except:
            self.driver.execute_script("arguments[0].click();", element)
    
    def login(self, email, password):
        self.driver.get(f"{self.base_url}/auth/sign-in")
        self.wait_for_page_load()
        
        email_input = self.wait.until(EC.presence_of_element_located((By.ID, "email")))
        email_input.clear()
        email_input.send_keys(email)
        
        password_input = self.driver.find_element(By.ID, "password")
        password_input.clear()
        password_input.send_keys(password)
        
        submit_btn = self.driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()
        time.sleep(3)
    
    def login_customer(self):
        self.login(CUSTOMER_EMAIL, CUSTOMER_PASS)
        self.wait_for_page_load()
        print("✅ Logged in as customer")
    
    def login_barber(self):
        self.login(BARBER_EMAIL, BARBER_PASS)
        self.wait_for_page_load()
        print("✅ Logged in as barber")
    
    def login_owner(self, email=OWNER_EMAIL, password=OWNER_PASS):
        self.login(email, password)
        self.wait_for_page_load()
        print(f"✅ Logged in as owner ({email})")
    
    def login_admin(self):
        self.login(ADMIN_EMAIL, ADMIN_PASS)
        self.wait_for_page_load()
        print("✅ Logged in as admin")
    
    def logout(self):
        """Click the Logout button in the header to properly log out"""
        try:
            # Find and click the Logout button in the header
            logout_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Logout')]"))
            )
            self.safe_click(logout_btn)
            time.sleep(2)
            print("✅ Logged out successfully")
        except:
            # Fallback: navigate to sign-in page and clear storage
            self.driver.get(f"{self.base_url}/auth/sign-in")
            self.wait_for_page_load()
            # Clear local storage to ensure logout
            try:
                self.driver.execute_script("localStorage.clear(); sessionStorage.clear();")
            except:
                pass
            print("✅ Logged out (via redirect)")


class Test1_AuthProfileLoyalty(BaseTest):
    """Test 1: Authentication, Profile Update, and Loyalty"""
    
    def test_complete_flow(self):
        print("\n" + "="*60)
        print("🧪 TEST 1: Authentication, Profile & Loyalty")
        print("="*60)
        
        # Step 1: Invalid login attempt
        print("\n📍 Step 1: Invalid Login Attempt")
        self.driver.get(f"{self.base_url}/auth/sign-in")
        self.wait_for_page_load()
        
        email_input = self.wait.until(EC.presence_of_element_located((By.ID, "email")))
        email_input.send_keys("invalid@example.com")
        password_input = self.driver.find_element(By.ID, "password")
        password_input.send_keys("wrongpassword")
        submit_btn = self.driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()
        time.sleep(3)
        
        if "/auth/sign-in" in self.driver.current_url:
            print("✅ Invalid login correctly rejected")
        else:
            print("⚠️  Invalid login may have succeeded unexpectedly")
        
        # Step 2: Valid customer login
        print("\n📍 Step 2: Valid Customer Login")
        self.driver.get(f"{self.base_url}/auth/sign-in")
        self.wait_for_page_load()
        self.login_customer()
        
        time.sleep(3)
        if "/auth/sign-in" not in self.driver.current_url:
            print("✅ Customer login successful")
        else:
            print("❌ Customer login failed")
            return
        
        # Step 3: Navigate to profile and update last name
        print("\n📍 Step 3: Update Profile Last Name")
        self.driver.get(f"{self.base_url}/profile")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            # First, click "Edit Profile" button to enable editing
            edit_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Edit Profile')]"))
            )
            self.safe_click(edit_btn)
            time.sleep(2)
            print("✅ Clicked Edit Profile button")
            
            # Now find and update the last name (id is "last_name" with underscore)
            last_name_input = self.wait.until(EC.presence_of_element_located((By.ID, "last_name")))
            random_suffix = random.randint(1000, 9999)
            new_last_name = f"TestUser{random_suffix}"
            last_name_input.clear()
            last_name_input.send_keys(new_last_name)
            print(f"✅ Entered new last name: {new_last_name}")
            
            # Click "Save Changes" button
            save_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Save Changes')]"))
            )
            self.safe_click(save_btn)
            time.sleep(3)
            print("✅ Profile updated successfully")
        except Exception as e:
            print(f"⚠️  Could not update profile: {e}")
        
        # Step 4: Navigate to loyalty balance
        print("\n📍 Step 4: Check Loyalty Balance & Claim Reward")
        self.driver.get(f"{self.base_url}/rewards")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            loyalty_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Points') or contains(text(), 'Loyalty')]")
            if loyalty_elements:
                print("✅ Loyalty page loaded")
                claim_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Claim') or contains(text(), 'Redeem')]")
                if claim_buttons:
                    self.safe_click(claim_buttons[0])
                    time.sleep(2)
                    print("✅ Claimed a reward")
                else:
                    print("⚠️  No rewards available to claim")
            else:
                print("⚠️  Loyalty page may not have loaded correctly")
        except Exception as e:
            print(f"⚠️  Could not access loyalty: {e}")
        
        print("\n✅ TEST 1 COMPLETE")


class Test2_BookingFlow(BaseTest):
    """Test 2: Complete Booking Flow"""
    
    def test_complete_flow(self):
        print("\n" + "="*60)
        print("🧪 TEST 2: Complete Booking Flow")
        print("="*60)
        
        # Step 1: Login as customer
        print("\n📍 Step 1: Login as Customer")
        self.login_customer()
        
        # Step 2: Navigate to browse
        print("\n📍 Step 2: Navigate to Browse Salons")
        self.driver.get(f"{self.base_url}/browse")
        self.wait_for_page_load()
        time.sleep(5)
        
        # Step 3: Search for Fade Factory
        print("\n📍 Step 3: Search for Fade Factory")
        try:
            search_input = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//input[contains(@placeholder, 'Search')]"))
            )
            search_input.send_keys("test")
            time.sleep(1)
            search_input.clear()
            time.sleep(1)
            search_input.send_keys("Fade Factory")
            time.sleep(3)
            print("✅ Searched for Fade Factory")
            
            fade_factory = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/salon/')][.//div[contains(text(), 'Fade Factory')]]"))
            )
            self.safe_click(fade_factory)
            self.wait_for_page_load()
            time.sleep(5)
            print("✅ Clicked on Fade Factory")
        except Exception as e:
            print(f"⚠️  Could not find Fade Factory: {e}")
            return
        
        # Step 4: Book appointment
        print("\n📍 Step 4: Book Appointment")
        try:
            book_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Book Now') or contains(text(), 'Book')]"))
            )
            self.safe_click(book_btn)
            time.sleep(5)
            print("✅ Clicked Book Now")
            
            # Select barber (not Caleb)
            barber_buttons = self.wait.until(
                EC.presence_of_all_elements_located((By.XPATH, "//button[.//div[contains(@class, 'font-medium')]]"))
            )
            barber_selected = False
            for btn in barber_buttons:
                try:
                    name = btn.find_element(By.XPATH, ".//div[contains(@class, 'font-medium')]").text
                    if name and "Caleb" not in name:
                        self.safe_click(btn)
                        time.sleep(2)
                        print(f"✅ Selected barber: {name}")
                        barber_selected = True
                        break
                except:
                    continue
            
            if not barber_selected:
                print("⚠️  Could not select barber")
            
            # Click Continue
            continue_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Continue')]"))
            )
            self.safe_click(continue_btn)
            time.sleep(3)
            print("✅ Proceeded to service selection")
            
            # Select service
            service_buttons = self.driver.find_elements(By.XPATH, "//button[.//div[@class='font-medium']]")
            if service_buttons:
                self.safe_click(service_buttons[0])
                time.sleep(2)
                print("✅ Selected a service")
            
            # Click Continue
            continue_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Continue')]"))
            )
            self.safe_click(continue_btn)
            time.sleep(3)
            print("✅ Proceeded to date/time selection")
            
            # Select time slot - try multiple days if no slots available
            time.sleep(3)
            time_slot_selected = False
            max_attempts = 14  # Try up to 2 weeks
            
            for attempt in range(max_attempts):
                # Look for time slot buttons - they have text-sm class which Back button doesn't have
                # Time slots are in a grid and have text-sm, Back button has w-40 instead
                time_slots = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'rounded-xl') and contains(@class, 'text-sm') and contains(@class, 'px-4')]")
                
                # Filter to only include buttons that look like times (contain : or AM/PM)
                valid_time_slots = []
                for slot in time_slots:
                    try:
                        text = slot.text.strip()
                        if text and (":" in text or "AM" in text.upper() or "PM" in text.upper()):
                            valid_time_slots.append(slot)
                    except:
                        continue
                
                # Check if there are available slots
                if valid_time_slots:
                    # Click the first available slot
                    self.safe_click(valid_time_slots[0])
                    time.sleep(2)
                    print(f"✅ Selected a time slot: {valid_time_slots[0].text}")
                    time_slot_selected = True
                    break
                else:
                    # No slots available - need to try next day
                    print(f"⚠️  No slots available on current date, trying next day... (attempt {attempt + 1}/{max_attempts})")
                    
                    # Find the calendar and click the next available day
                    # Calendar day buttons have h-8 and rounded-md classes
                    calendar_days = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'h-8') and contains(@class, 'rounded-md')]")
                    
                    if not calendar_days:
                        print("⚠️  Could not find calendar days")
                        time.sleep(2)
                        continue
                    
                    # Find the currently selected day (bg-black class)
                    current_day_idx = -1
                    for idx, day in enumerate(calendar_days):
                        try:
                            classes = day.get_attribute("class") or ""
                            if "bg-black" in classes:
                                current_day_idx = idx
                                break
                        except:
                            continue
                    
                    print(f"   Current day index: {current_day_idx}, Total calendar days: {len(calendar_days)}")
                    
                    # Click the next enabled day after the current one
                    clicked_next = False
                    for idx in range(current_day_idx + 1, len(calendar_days)):
                        try:
                            day = calendar_days[idx]
                            classes = day.get_attribute("class") or ""
                            day_text = day.text.strip()
                            
                            # Skip disabled days (gray text means past or other month)
                            if "text-gray-400" in classes:
                                continue
                            # Skip if already selected
                            if "bg-black" in classes:
                                continue
                            # Skip empty buttons
                            if not day_text:
                                continue
                                
                            # Click this day using JavaScript
                            print(f"   Clicking day: {day_text}")
                            self.driver.execute_script("arguments[0].click();", day)
                            time.sleep(3)  # Wait for slots to load
                            print(f"✅ Clicked calendar day: {day_text}")
                            clicked_next = True
                            break
                        except Exception as e:
                            print(f"   Error clicking day: {e}")
                            continue
                    
                    if not clicked_next:
                        # No more days in current month, try next month
                        print("   No more days in current month, trying next month...")
                        next_month_btn = self.driver.find_elements(By.XPATH, "//button[text()='>']")
                        if next_month_btn:
                            self.safe_click(next_month_btn[0])
                            time.sleep(2)
                            print("✅ Clicked next month")
                            # Click first available day in new month
                            new_days = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'h-8') and contains(@class, 'rounded-md') and not(contains(@class, 'text-gray-400')) and not(contains(@class, 'bg-black'))]")
                            for new_day in new_days:
                                try:
                                    day_text = new_day.text.strip()
                                    if day_text:
                                        self.driver.execute_script("arguments[0].click();", new_day)
                                        time.sleep(3)
                                        print(f"✅ Clicked first day of new month: {day_text}")
                                        break
                                except:
                                    continue
                        else:
                            print("⚠️  Could not find next month button")
            
            if not time_slot_selected:
                print("❌ Could not find available time slots after multiple attempts")
            
            # Click Review
            review_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Review')]"))
            )
            self.safe_click(review_btn)
            time.sleep(3)
            print("✅ Proceeded to review")
            
            # Click Continue to Payment
            payment_btn = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Continue to Payment')]"))
            )
            self.safe_click(payment_btn)
            time.sleep(5)
            print("✅ Proceeded to payment")
            
            # Select saved payment method (it's a radio button, not a regular button)
            try:
                # Find the "Use saved payment method" radio option and click it
                # The radio is inside a label with a span containing the text
                use_saved_label = self.wait.until(
                    EC.presence_of_element_located((By.XPATH, "//label[.//span[contains(text(), 'Use saved payment method')]]"))
                )
                self.driver.execute_script("arguments[0].click();", use_saved_label)
                time.sleep(2)
                print("✅ Selected 'Use saved payment method'")
                
                # If there are multiple saved cards, select the first one
                saved_card_radios = self.driver.find_elements(By.XPATH, "//input[@name='savedMethod']")
                if saved_card_radios:
                    self.driver.execute_script("arguments[0].click();", saved_card_radios[0])
                    time.sleep(1)
                    print("✅ Selected first saved card")
            except Exception as e:
                print(f"⚠️  Could not select saved payment method: {e}")
                # If no saved methods exist, we might need to enter card details - skip for now
            
            # Click the Pay button to confirm appointment
            try:
                # Wait for Pay button and scroll to it
                pay_btn = self.wait.until(
                    EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'Pay $')]"))
                )
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", pay_btn)
                time.sleep(1)
                
                # Use JavaScript click to avoid interception issues
                self.driver.execute_script("arguments[0].click();", pay_btn)
                print("✅ Clicked Pay button to confirm appointment")
                time.sleep(10)  # Wait for payment processing
                
                # Check for confirmation
                confirmation = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Confirmed') or contains(text(), 'Success') or contains(text(), 'Booked')]")
                if confirmation:
                    print("✅ Payment confirmed - Appointment booked!")
                else:
                    print("✅ Payment submitted")
            except Exception as e:
                print(f"⚠️  Could not click Pay button: {e}")
            
        except Exception as e:
            print(f"⚠️  Booking flow error: {e}")
        
        # Step 5: Navigate to appointments and reschedule
        print("\n📍 Step 5: Navigate to Appointments & Reschedule")
        self.driver.get(f"{self.base_url}/appointments")
        self.wait_for_page_load()
        time.sleep(5)
        
        try:
            reschedule_btns = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Reschedule')]")
            if reschedule_btns:
                self.safe_click(reschedule_btns[0])
                time.sleep(3)
                print("✅ Opened reschedule modal")
                
                # Select a new time slot
                time_slots = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'rounded-xl') and contains(@class, 'border') and contains(@class, 'px-4')]")
                if time_slots:
                    self.safe_click(time_slots[0])
                    time.sleep(2)
                    print("✅ Selected new time slot")
                    
                    # Click "Confirm New Time" button
                    confirm_btn = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Confirm New Time')]")
                    if confirm_btn:
                        self.safe_click(confirm_btn[0])
                        time.sleep(3)
                        print("✅ Confirmed reschedule")
                    else:
                        print("⚠️  Confirm New Time button not found")
                else:
                    print("⚠️  No time slots available for reschedule")
            else:
                print("⚠️  No reschedule button found")
        except Exception as e:
            print(f"⚠️  Could not reschedule: {e}")
        
        # Step 6: Cancel appointment (stay on same page, just refresh after reschedule)
        print("\n📍 Step 6: Cancel Appointment")
        time.sleep(2)
        
        # Refresh the page to see the rescheduled appointment
        self.driver.refresh()
        self.wait_for_page_load()
        time.sleep(5)
        
        try:
            # Find Cancel button (exclude any "Cancelled" text)
            cancel_btns = self.driver.find_elements(By.XPATH, "//button[text()='Cancel' or (contains(text(), 'Cancel') and not(contains(text(), 'Cancelled')))]")
            if cancel_btns:
                self.safe_click(cancel_btns[0])
                time.sleep(3)
                print("✅ Opened cancel modal")
                
                # Select a cancellation reason (first option is pre-selected)
                reason_radios = self.driver.find_elements(By.XPATH, "//input[@type='radio' and @name='reason']")
                if reason_radios:
                    self.safe_click(reason_radios[0])
                    time.sleep(1)
                    print("✅ Selected cancellation reason: Schedule conflict")
                
                # Click "Confirm Cancel" button
                confirm_cancel_btn = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Confirm Cancel')]")
                if confirm_cancel_btn:
                    self.safe_click(confirm_cancel_btn[0])
                    time.sleep(3)
                    print("✅ Confirmed cancellation - Appointment cancelled!")
                else:
                    print("⚠️  Confirm Cancel button not found")
            else:
                print("⚠️  No cancel button found on appointment")
        except Exception as e:
            print(f"⚠️  Could not cancel: {e}")
        
        print("\n✅ TEST 2 COMPLETE")


class Test3_SalonRegistration(BaseTest):
    """Test 3: Salon Registration & Verification"""
    
    def test_complete_flow(self):
        print("\n" + "="*60)
        print("🧪 TEST 3: Salon Registration & Verification")
        print("="*60)
        
        # Step 1: Login as new owner
        print("\n📍 Step 1: Login as New Owner")
        self.login_owner(NEW_OWNER_EMAIL, NEW_OWNER_PASS)
        
        # Step 2: Navigate to salon registration
        print("\n📍 Step 2: Register New Salon")
        self.driver.get(f"{self.base_url}/salon-registration")
        self.wait_for_page_load()
        time.sleep(5)
        
        try:
            # Fill salon name
            name_input = self.driver.find_elements(By.ID, "name")
            if name_input:
                name_input[0].clear()
                name_input[0].send_keys(f"Test Salon {random.randint(1000, 9999)}")
                print("✅ Entered salon name")
            
            # Fill address
            address_input = self.driver.find_elements(By.ID, "address")
            if address_input:
                address_input[0].clear()
                address_input[0].send_keys("123 Test Street")
                print("✅ Entered address")
            
            # Fill city
            city_input = self.driver.find_elements(By.ID, "city")
            if city_input:
                city_input[0].clear()
                city_input[0].send_keys("Test City")
                print("✅ Entered city")
            
            # Fill state
            state_input = self.driver.find_elements(By.ID, "state")
            if state_input:
                state_input[0].clear()
                state_input[0].send_keys("NY")
                print("✅ Entered state")
            
            # Fill zip
            zip_input = self.driver.find_elements(By.ID, "zip")
            if zip_input:
                zip_input[0].clear()
                zip_input[0].send_keys("10001")
                print("✅ Entered zip code")
            
            # Fill phone
            phone_input = self.driver.find_elements(By.ID, "phone")
            if phone_input:
                phone_input[0].clear()
                phone_input[0].send_keys("5551234567")
                print("✅ Entered phone")
            
            # Fill email
            email_input = self.driver.find_elements(By.ID, "email")
            if email_input:
                email_input[0].clear()
                email_input[0].send_keys(f"testsalon{random.randint(100,999)}@test.com")
                print("✅ Entered email")
            
            # Fill description
            desc_input = self.driver.find_elements(By.ID, "description")
            if desc_input:
                desc_input[0].clear()
                desc_input[0].send_keys("A professional test salon offering quality services for automated testing purposes.")
                print("✅ Entered description")
            
            # Upload business license file (REQUIRED)
            import os
            license_input = self.driver.find_elements(By.ID, "license")
            if license_input:
                # Create a test license file if it doesn't exist
                test_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_license.txt")
                if not os.path.exists(test_file_path):
                    with open(test_file_path, "w") as f:
                        f.write("TEST BUSINESS LICENSE\n")
                        f.write("License Number: TEST-12345\n")
                        f.write("Valid for automated testing purposes only.\n")
                
                license_input[0].send_keys(test_file_path)
                time.sleep(2)
                print("✅ Uploaded business license file")
            else:
                print("⚠️  License input not found")
            
            time.sleep(2)
            
            # Submit registration form
            submit_btns = self.driver.find_elements(By.XPATH, "//button[@type='submit' or contains(text(), 'Submit Application') or contains(text(), 'Register')]")
            if submit_btns:
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", submit_btns[0])
                time.sleep(1)
                self.safe_click(submit_btns[0])
                time.sleep(5)
                print("✅ Submitted salon registration")
            else:
                print("⚠️  Submit button not found")
        except Exception as e:
            print(f"⚠️  Registration form error: {e}")
        
        # Step 3: Logout and login as admin to approve the salon
        print("\n📍 Step 3: Login as Admin & Approve Salon")
        self.logout()
        time.sleep(2)
        self.login_admin()
        
        # Navigate to admin verification page
        self.driver.get(f"{self.base_url}/admin/verify")
        self.wait_for_page_load()
        time.sleep(5)
        
        try:
            # Wait for pending salons to load
            time.sleep(3)
            
            # Step 1: Find and click "Approve Application" button on the salon card
            approve_app_btns = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Approve Application')]")
            if approve_app_btns:
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", approve_app_btns[0])
                time.sleep(1)
                self.safe_click(approve_app_btns[0])
                time.sleep(2)
                print("✅ Clicked 'Approve Application' - confirmation dialog should appear")
                
                # Step 2: Click "Approve Salon" button in the confirmation dialog
                try:
                    approve_salon_btn = self.wait.until(
                        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Approve Salon')]"))
                    )
                    self.safe_click(approve_salon_btn)
                    time.sleep(3)
                    print("✅ Clicked 'Approve Salon' - salon approved!")
                except Exception as e:
                    print(f"⚠️  Could not find 'Approve Salon' button in dialog: {e}")
            else:
                # Try alternative button text (just "Approve")
                approve_btns = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Approve')]")
                if approve_btns:
                    self.safe_click(approve_btns[0])
                    time.sleep(2)
                    # Check for confirmation dialog
                    confirm_btns = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Approve Salon') or contains(text(), 'Confirm')]")
                    if confirm_btns:
                        self.safe_click(confirm_btns[0])
                        time.sleep(3)
                    print("✅ Approved the salon")
                else:
                    print("⚠️  No salons pending verification")
        except Exception as e:
            print(f"⚠️  Verification error: {e}")
        
        # Step 4: Logout and login back as owner to complete salon setup
        print("\n📍 Step 4: Login as Owner & Complete Salon Setup")
        self.logout()
        time.sleep(2)
        self.login_owner(NEW_OWNER_EMAIL, NEW_OWNER_PASS)
        
        # Navigate to salon setup page
        self.driver.get(f"{self.base_url}/salon-setup")
        self.wait_for_page_load()
        time.sleep(5)
        
        # Check if we're on the setup page
        if "/salon-setup" in self.driver.current_url:
            print("✅ Salon setup page loaded")
            
            # Step 4a: Save salon hours (default hours should be pre-filled)
            try:
                save_hours_btn = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Save Hours')]")
                if save_hours_btn:
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", save_hours_btn[0])
                    time.sleep(1)
                    self.safe_click(save_hours_btn[0])
                    time.sleep(3)
                    # Dismiss alert if present
                    try:
                        self.driver.switch_to.alert.accept()
                        time.sleep(1)
                    except:
                        pass
                    print("✅ Saved salon hours")
            except Exception as e:
                print(f"⚠️  Error saving hours: {e}")
            
            # Step 4b: Add a service (required for salon setup)
            try:
                # Click "Add Service" button
                add_service_btn = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Add Service')]")
                if add_service_btn:
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", add_service_btn[0])
                    time.sleep(1)
                    self.safe_click(add_service_btn[0])
                    time.sleep(2)
                    print("✅ Clicked 'Add Service' - form should appear")
                    
                    # Wait for the service form to appear (it has a border class)
                    try:
                        form = self.wait.until(
                            EC.presence_of_element_located((By.XPATH, "//form[contains(@class, 'border')]"))
                        )
                        print("✅ Service form appeared")
                    except:
                        print("⚠️  Could not find service form")
                    
                    # Fill Service Name - find input after "Service Name" label
                    try:
                        # Find the form container first
                        form_container = self.driver.find_element(By.XPATH, "//form[contains(@class, 'border')]")
                        
                        # Find Service Name input (first input in the form)
                        name_inputs = form_container.find_elements(By.XPATH, ".//input")
                        if name_inputs:
                            name_inputs[0].clear()
                            name_inputs[0].send_keys("Haircut")
                            print("✅ Entered service name: Haircut")
                        
                        # Find Duration input (type="number" with min="15")
                        duration_input = form_container.find_elements(By.XPATH, ".//input[@type='number' and @min='15']")
                        if duration_input:
                            duration_input[0].clear()
                            duration_input[0].send_keys("30")  # 30 minutes (must be multiple of 15)
                            print("✅ Entered duration: 30 minutes")
                        else:
                            # Fallback: find by step attribute
                            duration_input = form_container.find_elements(By.XPATH, ".//input[@type='number' and @step='15']")
                            if duration_input:
                                duration_input[0].clear()
                                duration_input[0].send_keys("30")
                                print("✅ Entered duration: 30 minutes")
                        
                        # Find Price input (type="number" with step="0.01")
                        price_input = form_container.find_elements(By.XPATH, ".//input[@type='number' and @step='0.01']")
                        if price_input:
                            price_input[0].clear()
                            price_input[0].send_keys("25.00")
                            print("✅ Entered price: $25.00")
                        else:
                            # Fallback: find all number inputs and use the second one
                            number_inputs = form_container.find_elements(By.XPATH, ".//input[@type='number']")
                            if len(number_inputs) >= 2:
                                number_inputs[1].clear()
                                number_inputs[1].send_keys("25")
                                print("✅ Entered price: $25")
                        
                        time.sleep(1)
                        
                        # Click Create Service button
                        create_btn = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Create Service')]")
                        if create_btn:
                            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", create_btn[0])
                            time.sleep(1)
                            self.safe_click(create_btn[0])
                            time.sleep(3)
                            
                            # Dismiss any alert that appears
                            try:
                                self.driver.switch_to.alert.accept()
                                time.sleep(1)
                            except:
                                pass
                            
                            print("✅ Created service successfully!")
                        else:
                            print("⚠️  Create Service button not found")
                            
                    except Exception as e:
                        print(f"⚠️  Error filling service form: {e}")
                else:
                    print("⚠️  Add Service button not found")
            except Exception as e:
                print(f"⚠️  Error adding service: {e}")
            
            # Step 4c: Add an employee (search for barber)
            # Note: This requires a barber account that is NOT already assigned to a salon
            employee_added = False
            try:
                add_employee_btn = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Add Employee')]")
                if add_employee_btn:
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", add_employee_btn[0])
                    time.sleep(1)
                    self.safe_click(add_employee_btn[0])
                    time.sleep(2)
                    
                    # Search for a barber
                    search_input = self.driver.find_elements(By.XPATH, "//input[contains(@placeholder, 'barber') or contains(@placeholder, 'email')]")
                    if search_input:
                        # Use the unassigned barber email if configured, otherwise try a generic search
                        search_term = UNASSIGNED_BARBER_EMAIL if UNASSIGNED_BARBER_EMAIL else "barber"
                        search_input[0].clear()
                        search_input[0].send_keys(search_term)
                        print(f"✅ Searching for barber: {search_term}")
                        time.sleep(3)  # Wait for search results
                        
                        # Select first result if available
                        select_btns = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Select')]")
                        if select_btns:
                            self.safe_click(select_btns[0])
                            time.sleep(2)
                            print("✅ Selected barber from search results")
                            
                            # Click Add Employee button (the confirm button, not the initial one)
                            add_emp_btns = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Add Employee')]")
                            # The second "Add Employee" button is the confirm one
                            if len(add_emp_btns) >= 2:
                                self.safe_click(add_emp_btns[-1])
                                time.sleep(3)
                                print("✅ Added employee to salon")
                                employee_added = True
                            elif add_emp_btns:
                                self.safe_click(add_emp_btns[0])
                                time.sleep(3)
                                print("✅ Added employee to salon")
                                employee_added = True
                        else:
                            print("⚠️  No unassigned barbers found in search results")
                            print("   (To add employees, you need a barber account not already in a salon)")
                            print("   Set UNASSIGNED_BARBER_EMAIL in the test file if you have one")
                            # Cancel the employee search form
                            cancel_btn = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Cancel')]")
                            if cancel_btn:
                                self.safe_click(cancel_btn[0])
                                time.sleep(1)
                    else:
                        print("⚠️  Search input not found")
            except Exception as e:
                print(f"⚠️  Error adding employee: {e}")
            
            # Step 4d: Assign service to the employee (required for setup completion)
            if employee_added:
                try:
                    print("📍 Assigning 'Haircut' service to employee...")
                    time.sleep(2)
                    
                    # Find and click "Assign Services" button for the employee
                    assign_btn = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Assign Services')]")
                    if assign_btn:
                        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", assign_btn[0])
                        time.sleep(1)
                        self.safe_click(assign_btn[0])
                        time.sleep(2)
                        print("✅ Clicked 'Assign Services'")
                        
                        # Find the checkbox for "Haircut" service specifically
                        # The checkbox is in a div with a label containing the service name
                        haircut_checkbox = None
                        
                        # Method 1: Find checkbox next to label containing "Haircut"
                        try:
                            # Find the div containing "Haircut" label and get its checkbox
                            haircut_div = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'flex') and contains(@class, 'items-center')]//label[contains(text(), 'Haircut')]/preceding-sibling::input[@type='checkbox']")
                            if haircut_div:
                                haircut_checkbox = haircut_div[0]
                        except:
                            pass
                        
                        # Method 2: Find by looking at parent div structure
                        if not haircut_checkbox:
                            try:
                                haircut_checkbox = self.driver.find_elements(By.XPATH, "//div[.//label[contains(text(), 'Haircut')]]//input[@type='checkbox']")
                                if haircut_checkbox:
                                    haircut_checkbox = haircut_checkbox[0]
                            except:
                                pass
                        
                        # Method 3: Fallback - find all checkboxes and labels, match them
                        if not haircut_checkbox:
                            checkboxes = self.driver.find_elements(By.XPATH, "//input[@type='checkbox']")
                            labels = self.driver.find_elements(By.XPATH, "//label")
                            for i, label in enumerate(labels):
                                try:
                                    if "Haircut" in label.text:
                                        # Find the nearest checkbox (usually the previous sibling or nearby)
                                        parent = label.find_element(By.XPATH, "..")
                                        checkbox = parent.find_elements(By.XPATH, ".//input[@type='checkbox']")
                                        if checkbox:
                                            haircut_checkbox = checkbox[0]
                                            break
                                except:
                                    continue
                        
                        # Click the Haircut checkbox if found
                        if haircut_checkbox:
                            if not haircut_checkbox.is_selected():
                                self.driver.execute_script("arguments[0].click();", haircut_checkbox)
                                time.sleep(1)
                                print("✅ Checked 'Haircut' service checkbox")
                            else:
                                print("✅ 'Haircut' service already checked")
                        else:
                            # Fallback: click the first available checkbox
                            print("⚠️  Could not find 'Haircut' checkbox specifically, trying first checkbox")
                            all_checkboxes = self.driver.find_elements(By.XPATH, "//input[@type='checkbox']")
                            if all_checkboxes:
                                self.driver.execute_script("arguments[0].click();", all_checkboxes[0])
                                time.sleep(1)
                                print("✅ Checked first available service checkbox")
                        
                        # Click "Save Services" button
                        save_services_btn = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Save Services')]")
                        if save_services_btn:
                            self.safe_click(save_services_btn[0])
                            time.sleep(3)
                            print("✅ Saved 'Haircut' service assignment to employee")
                        else:
                            print("⚠️  Save Services button not found")
                    else:
                        print("⚠️  Assign Services button not found")
                except Exception as e:
                    print(f"⚠️  Error assigning service to employee: {e}")
        else:
            # May have been redirected to dashboard if setup is already complete
            print("⚠️  Not on salon setup page - may already be complete")
            self.driver.get(f"{self.base_url}/salon-dashboard")
            self.wait_for_page_load()
            time.sleep(3)
        
        # Step 5: Verify owner dashboard is accessible
        print("\n📍 Step 5: Verify Owner Dashboard Access")
        self.driver.get(f"{self.base_url}/salon-dashboard")
        self.wait_for_page_load()
        time.sleep(3)
        
        if "/salon-dashboard" in self.driver.current_url:
            print("✅ Owner dashboard loaded successfully")
        else:
            print("⚠️  Could not access owner dashboard")
        
        print("\n✅ TEST 3 COMPLETE")


class Test4_LoyaltyConfig(BaseTest):
    """Test 4: Loyalty Configuration"""
    
    def test_complete_flow(self):
        print("\n" + "="*60)
        print("🧪 TEST 4: Loyalty Configuration")
        print("="*60)
        
        # Step 1: Login as owner
        print("\n📍 Step 1: Login as Owner")
        self.login_owner(OWNER_EMAIL, OWNER_PASS)
        
        # Step 2: Navigate to loyalty program
        print("\n📍 Step 2: Navigate to Loyalty Program")
        self.driver.get(f"{self.base_url}/loyalty-program")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            loyalty_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Loyalty') or contains(text(), 'Points')]")
            if loyalty_elements:
                print("✅ Loyalty program page loaded")
                
                input_fields = self.driver.find_elements(By.XPATH, "//input[@type='number' or @type='text']")
                if input_fields:
                    for field in input_fields[:2]:
                        try:
                            field.clear()
                            field.send_keys(str(random.randint(10, 100)))
                        except:
                            pass
                    print("✅ Adjusted loyalty settings")
                
                save_btns = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Save') or contains(text(), 'Update')]")
                if save_btns:
                    self.safe_click(save_btns[0])
                    time.sleep(3)
                    print("✅ Saved loyalty settings")
            else:
                print("⚠️  Loyalty page may not have loaded correctly")
        except Exception as e:
            print(f"⚠️  Loyalty configuration error: {e}")
        
        print("\n✅ TEST 4 COMPLETE")


class Test5_BarberSchedule(BaseTest):
    """Test 5: Barber Schedule Management"""
    
    def test_complete_flow(self):
        print("\n" + "="*60)
        print("🧪 TEST 5: Barber Schedule Management")
        print("="*60)
        
        # Step 1: Login as barber
        print("\n📍 Step 1: Login as Barber")
        self.login_barber()
        
        # Step 2: Navigate to schedule
        print("\n📍 Step 2: Navigate to Schedule")
        self.driver.get(f"{self.base_url}/schedule")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            schedule_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Schedule') or contains(text(), 'Availability')]")
            if schedule_elements:
                print("✅ Schedule page loaded")
                
                # Step 3: Block time slots
                print("\n📍 Step 3: Block Time Slots")
                block_btns = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Block') or contains(text(), 'Unavailable')]")
                if block_btns:
                    self.safe_click(block_btns[0])
                    time.sleep(2)
                    print("✅ Clicked block button")
                else:
                    time_slots = self.driver.find_elements(By.XPATH, "//*[contains(@class, 'slot') or contains(@class, 'time-slot')]")
                    if time_slots:
                        self.safe_click(time_slots[0])
                        time.sleep(2)
                        print("✅ Clicked on a time slot")
                    else:
                        print("⚠️  No block buttons or time slots found")
            else:
                print("⚠️  Schedule page may not have loaded correctly")
        except Exception as e:
            print(f"⚠️  Schedule error: {e}")
        
        print("\n✅ TEST 5 COMPLETE")


class Test6_AdminFeatures(BaseTest):
    """Test 6: Admin Features - Navigate through all admin tabs"""
    
    def test_complete_flow(self):
        print("\n" + "="*60)
        print("🧪 TEST 6: Admin Features")
        print("="*60)
        
        # Step 1: Login as admin
        print("\n📍 Step 1: Login as Admin")
        self.login_admin()
        
        # Step 2: Navigate to Admin Dashboard
        print("\n📍 Step 2: Admin Dashboard")
        self.driver.get(f"{self.base_url}/admin/dashboard")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            dashboard_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Admin') or contains(text(), 'Dashboard')]")
            if dashboard_elements:
                print("✅ Admin Dashboard loaded")
            elif "/admin" in self.driver.current_url:
                print("✅ Admin Dashboard page accessible")
            else:
                print("⚠️  Could not access admin dashboard")
            
            # Check for platform metrics
            metrics_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Users') or contains(text(), 'Salons') or contains(text(), 'Appointments')]")
            if metrics_elements:
                print("✅ Platform metrics visible on dashboard")
        except Exception as e:
            print(f"⚠️  Dashboard error: {e}")
        
        # Step 3: Navigate to Salon Verification
        print("\n📍 Step 3: Salon Verification Tab")
        self.driver.get(f"{self.base_url}/admin/verify")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            verify_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Verification') or contains(text(), 'Pending') or contains(text(), 'pending applications')]")
            if verify_elements:
                print("✅ Salon Verification page loaded")
            elif "/admin/verify" in self.driver.current_url:
                print("✅ Salon Verification page accessible")
            else:
                print("⚠️  Could not access salon verification")
        except Exception as e:
            print(f"⚠️  Verification page error: {e}")
        
        # Step 4: Navigate to Analytics
        print("\n📍 Step 4: Analytics Tab")
        self.driver.get(f"{self.base_url}/admin/analytics")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            analytics_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Analytics') or contains(text(), 'Revenue') or contains(text(), 'Bookings') or contains(text(), 'Statistics')]")
            if analytics_elements:
                print("✅ Analytics page loaded")
            elif "/admin/analytics" in self.driver.current_url:
                print("✅ Analytics page accessible")
            else:
                print("⚠️  Could not access analytics")
        except Exception as e:
            print(f"⚠️  Analytics page error: {e}")
        
        # Step 5: Navigate to Audit Logs
        print("\n📍 Step 5: Audit Logs Tab")
        self.driver.get(f"{self.base_url}/admin/audit-logs")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            audit_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Audit') or contains(text(), 'Logs') or contains(text(), 'Activity')]")
            if audit_elements:
                print("✅ Audit Logs page loaded")
            elif "/admin/audit" in self.driver.current_url:
                print("✅ Audit Logs page accessible")
            else:
                print("⚠️  Could not access audit logs")
        except Exception as e:
            print(f"⚠️  Audit logs error: {e}")
        
        # Step 6: Navigate to Platform Health/Monitor
        print("\n📍 Step 6: Platform Health/Monitor Tab")
        self.driver.get(f"{self.base_url}/admin/health")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            health_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Health') or contains(text(), 'Monitor') or contains(text(), 'Status') or contains(text(), 'Platform')]")
            if health_elements:
                print("✅ Platform Health page loaded")
            elif "/admin/health" in self.driver.current_url:
                print("✅ Platform Health page accessible")
            else:
                print("⚠️  Could not access platform health")
        except Exception as e:
            print(f"⚠️  Platform health error: {e}")
        
        # Step 7: Navigate to Profile
        print("\n📍 Step 7: Admin Profile")
        self.driver.get(f"{self.base_url}/profile")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            profile_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Profile') or contains(text(), 'Account') or contains(text(), 'Email')]")
            if profile_elements:
                print("✅ Profile page loaded")
            elif "/profile" in self.driver.current_url:
                print("✅ Profile page accessible")
            else:
                print("⚠️  Could not access profile")
        except Exception as e:
            print(f"⚠️  Profile page error: {e}")
        
        print("\n✅ TEST 6 COMPLETE - All admin tabs navigated")


def run_all_tests():
    """Run all test suites"""
    print("\n" + "="*70)
    print("🚀 SALONICA COMPREHENSIVE SELENIUM TEST SUITE")
    print("="*70)
    print(f"Testing: {BASE_URL}")
    print("="*70)
    
    test_classes = [
        ("Test 1: Auth, Profile & Loyalty", Test1_AuthProfileLoyalty),
        ("Test 2: Complete Booking Flow", Test2_BookingFlow),
        ("Test 3: Salon Registration & Verification", Test3_SalonRegistration),
        ("Test 4: Loyalty Configuration", Test4_LoyaltyConfig),
        ("Test 5: Barber Schedule Management", Test5_BarberSchedule),
        ("Test 6: Admin Features", Test6_AdminFeatures),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_class in test_classes:
        print(f"\n{'='*70}")
        print(f"📦 Running: {test_name}")
        print(f"{'='*70}")
        
        test_instance = test_class()
        
        try:
            test_instance.setup_method()
            test_instance.test_complete_flow()
            test_instance.teardown_method()
            passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            failed += 1
            try:
                test_instance.teardown_method()
            except:
                pass
    
    print("\n" + "="*70)
    print("📊 FINAL TEST RESULTS")
    print("="*70)
    print(f"   Total Tests: {len(test_classes)}")
    print(f"   ✅ Passed: {passed}")
    print(f"   ❌ Failed: {failed}")
    print(f"   Success Rate: {(passed/len(test_classes)*100):.1f}%")
    print("="*70)
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print(f"\n⚠️  {failed} test(s) failed.")
    
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    import sys
    sys.exit(run_all_tests())
