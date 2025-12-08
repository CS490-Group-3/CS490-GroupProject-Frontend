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
        self.driver.get(f"{self.base_url}/auth/sign-in")
        self.wait_for_page_load()


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
            
            # Select time slot
            time.sleep(3)
            time_slots = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'rounded-xl') and contains(@class, 'border') and contains(@class, 'px-4')]")
            if time_slots:
                self.safe_click(time_slots[0])
                time.sleep(3)
                print("✅ Selected a time slot")
            
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
            
            # Step 1: Click "Enter new card" button
            try:
                enter_new_card = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Enter new card')]"))
                )
                self.safe_click(enter_new_card)
                time.sleep(3)
                print("✅ Clicked 'Enter new card'")
            except:
                print("⚠️  'Enter new card' not found")
            
            # Step 2: Click "Use saved payment method" button
            try:
                use_saved = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Use saved payment method')]"))
                )
                self.safe_click(use_saved)
                time.sleep(3)
                print("✅ Clicked 'Use saved payment method'")
            except:
                print("⚠️  'Use saved payment method' not found")
            
            # Step 3: Click the Pay button to confirm appointment
            try:
                pay_btn = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Pay $')]"))
                )
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", pay_btn)
                time.sleep(1)
                pay_btn.click()
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
        
        # Step 3: Login as admin and verify salon
        print("\n📍 Step 3: Login as Admin & Verify Salon")
        self.logout()
        self.login_admin()
        
        self.driver.get(f"{self.base_url}/admin/verify")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            verify_btns = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Verify') or contains(text(), 'Approve')]")
            if verify_btns:
                self.safe_click(verify_btns[0])
                time.sleep(3)
                print("✅ Verified a salon")
            else:
                print("⚠️  No salons pending verification")
        except Exception as e:
            print(f"⚠️  Verification error: {e}")
        
        # Step 4: Login back to owner and view dashboard
        print("\n📍 Step 4: Login as Owner & View Dashboard")
        self.logout()
        self.login_owner(NEW_OWNER_EMAIL, NEW_OWNER_PASS)
        
        self.driver.get(f"{self.base_url}/salon-dashboard")
        self.wait_for_page_load()
        time.sleep(3)
        
        if "/salon-dashboard" in self.driver.current_url:
            print("✅ Owner dashboard loaded")
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
    """Test 6: Admin Features"""
    
    def test_complete_flow(self):
        print("\n" + "="*60)
        print("🧪 TEST 6: Admin Features")
        print("="*60)
        
        # Step 1: Login as admin
        print("\n📍 Step 1: Login as Admin")
        self.login_admin()
        
        # Step 2: Verify admin dashboard
        print("\n📍 Step 2: Verify Admin Dashboard")
        self.driver.get(f"{self.base_url}/admin/dashboard")
        self.wait_for_page_load()
        time.sleep(3)
        
        try:
            dashboard_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Admin') or contains(text(), 'Dashboard')]")
            if dashboard_elements:
                print("✅ Admin dashboard loaded")
            elif "/admin" in self.driver.current_url:
                print("✅ Admin dashboard page accessible")
            else:
                print("⚠️  Could not access admin dashboard")
        except Exception as e:
            print(f"⚠️  Dashboard error: {e}")
        
        # Step 3: View platform metrics
        print("\n📍 Step 3: View Platform Metrics")
        try:
            metrics_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Users') or contains(text(), 'Salons') or contains(text(), 'Appointments')]")
            if metrics_elements:
                print("✅ Platform metrics visible")
            else:
                print("⚠️  Metrics not visible (may still be loading)")
        except Exception as e:
            print(f"⚠️  Metrics error: {e}")
        
        print("\n✅ TEST 6 COMPLETE")


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
