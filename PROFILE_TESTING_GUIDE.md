# Profile Feature Testing Guide

## Prerequisites

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Ensure backend is running** and accessible at the `VITE_API` URL configured in your `.env`

3. **Have test accounts** for each role (customer, owner, barber, admin) or use demo login if available

## Test Scenarios

### 1. Access Profile Page for All Roles

#### Test Customer Access
- [ ] Sign in as a customer
- [ ] Navigate to `/profile` or click "Profile" in header
- [ ] Verify page loads without errors
- [ ] Verify you see: Profile Info, Visit History, and Loyalty Points tabs

#### Test Owner Access
- [ ] Sign in as an owner
- [ ] Navigate to `/profile` or click "Profile" in header
- [ ] Verify page loads without errors
- [ ] Verify you see only "Profile Info" tab (no customer-specific tabs)
- [ ] Test in different owner states:
  - [ ] Owner with verified salon and setup complete
  - [ ] Owner with verified salon but setup incomplete
  - [ ] Owner without verified salon

#### Test Barber Access
- [ ] Sign in as a barber
- [ ] Navigate to `/profile` or click "Profile" in header
- [ ] Verify page loads without errors
- [ ] Verify you see only "Profile Info" tab

#### Test Admin Access
- [ ] Sign in as an admin
- [ ] Navigate to `/profile` or click "Profile" in header
- [ ] Verify page loads without errors
- [ ] Verify you see only "Profile Info" tab

### 2. View Profile Data

- [ ] Verify all fields display correctly:
  - [ ] First Name
  - [ ] Last Name
  - [ ] Email (read-only, grayed out)
  - [ ] Phone
  - [ ] Profile Image (or placeholder if none)
  - [ ] Date of Birth
  - [ ] Age Bracket
  - [ ] Gender
  - [ ] City
  - [ ] State
  - [ ] Preferred Services (as badges if any selected)

- [ ] Verify fields handle null/empty values gracefully:
  - [ ] Empty fields show placeholders or empty strings
  - [ ] No errors in console
  - [ ] UI doesn't break

### 3. Edit Profile - Basic Fields

- [ ] Click "Edit Profile" button
- [ ] Verify all fields become editable (except email)
- [ ] Test each field:

#### First Name
- [ ] Enter valid name (1-100 characters)
- [ ] Try entering > 100 characters (should show validation error)
- [ ] Leave empty (should be allowed - optional field)

#### Last Name
- [ ] Enter valid name (1-100 characters)
- [ ] Try entering > 100 characters (should show validation error)
- [ ] Leave empty (should be allowed)

#### Phone
- [ ] Enter valid phone number
- [ ] Try entering > 20 characters (should show validation error)
- [ ] Leave empty (should be allowed)

#### Date of Birth
- [ ] Select a valid date using date picker
- [ ] Verify format is YYYY-MM-DD
- [ ] Leave empty (should be allowed)

#### City
- [ ] Enter city name
- [ ] Try entering > 100 characters (should show validation error)
- [ ] Leave empty (should be allowed)

#### State
- [ ] Enter state name
- [ ] Try entering > 50 characters (should show validation error)
- [ ] Leave empty (should be allowed)

### 4. Edit Profile - Dropdown Fields

#### Age Bracket
- [ ] Click dropdown
- [ ] Verify all options appear: "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "None"
- [ ] Select an age bracket
- [ ] Verify selection is saved in form
- [ ] Select "None" to clear selection

#### Gender
- [ ] Click dropdown
- [ ] Verify all options appear: "Male", "Female", "Non-binary", "Prefer Not To Say", "Other", "None"
- [ ] Select a gender
- [ ] Verify selection is saved in form
- [ ] Select "None" to clear selection

### 5. Edit Profile - Preferred Services

- [ ] Verify services list loads from API
- [ ] In edit mode, verify services appear as clickable buttons
- [ ] Click a service to select it (should show checkmark)
- [ ] Click again to deselect
- [ ] Select multiple services
- [ ] Verify selected services are highlighted
- [ ] In view mode, verify selected services appear as badges
- [ ] Test with empty selection (should show "No preferred services selected")

### 6. Profile Image Upload

#### Upload Flow
- [ ] Click "Edit Profile"
- [ ] Click "Upload Image" button
- [ ] Select a valid image file (JPG, PNG, etc.)
- [ ] Verify:
  - [ ] File type validation (only images allowed)
  - [ ] File size validation (max 5MB)
  - [ ] Upload progress indicator shows "Uploading..."
- [ ] After upload:
  - [ ] Success message appears
  - [ ] Image preview updates with new image
  - [ ] Image URL is stored in form state

#### Save Image to Profile
- [ ] After uploading image, click "Save Changes"
- [ ] Verify:
  - [ ] Profile update includes `profile_image_url`
  - [ ] Success message appears
  - [ ] Image persists after page reload

#### Error Handling
- [ ] Try uploading non-image file (should show error)
- [ ] Try uploading file > 5MB (should show error)
- [ ] Test with network error (should show error message)

### 7. Save Profile Changes

- [ ] Make changes to multiple fields
- [ ] Click "Save Changes"
- [ ] Verify:
  - [ ] Loading state shows "Saving..."
  - [ ] Success message appears after save
  - [ ] Form exits edit mode
  - [ ] Changes persist after page reload
  - [ ] Updated data matches what was entered

- [ ] Test partial updates:
  - [ ] Only change one field
  - [ ] Save
  - [ ] Verify only that field is updated (other fields unchanged)

### 8. Cancel Profile Changes

- [ ] Click "Edit Profile"
- [ ] Make changes to fields
- [ ] Click "Cancel"
- [ ] Verify:
  - [ ] Form exits edit mode
  - [ ] All changes are reverted to original values
  - [ ] No data is saved

### 9. Error Handling

#### Network Errors
- [ ] Disconnect network
- [ ] Try to load profile (should show error message)
- [ ] Try to save profile (should show error message)

#### Validation Errors
- [ ] Enter invalid data (e.g., name > 100 chars)
- [ ] Try to save
- [ ] Verify frontend validation catches it before API call

#### Backend Validation Errors
- [ ] Enter invalid enum value (if possible)
- [ ] Try to save
- [ ] Verify error message displays backend validation details

#### API Error Responses
- [ ] Test with invalid token (401 error)
- [ ] Test with server error (500 error)
- [ ] Verify appropriate error messages display

### 10. Customer-Specific Features

#### Visit History Tab (Customer Only)
- [ ] Sign in as customer
- [ ] Click "Visit History" tab
- [ ] Verify:
  - [ ] Past appointments display correctly
  - [ ] Upcoming appointments display correctly
  - [ ] Empty state shows if no appointments
  - [ ] Appointment details are correct (salon, service, date, etc.)

#### Loyalty Points Tab (Customer Only)
- [ ] Sign in as customer
- [ ] Click "Loyalty Points" tab
- [ ] Verify:
  - [ ] Points summary displays for each salon
  - [ ] Recent activity shows if available
  - [ ] Empty state shows if no loyalty data

### 11. Role-Based Navigation

- [ ] Verify Profile link appears in header for:
  - [ ] Customer
  - [ ] Owner (all states)
  - [ ] Barber
  - [ ] Admin

- [ ] Click Profile link from header
- [ ] Verify it navigates to `/profile`

### 12. API Integration

#### Check Network Requests (Browser DevTools)
- [ ] Verify `GET /api/auth/me` is called on page load
- [ ] Verify `PUT /api/auth/profile` is called on save
- [ ] Verify `POST /api/users/me/images` is called on image upload
- [ ] Verify `GET /api/services?unique=name` is called for services list
- [ ] Verify all requests include `Authorization: Bearer <token>` header
- [ ] Verify request/response formats match backend spec

### 13. Data Persistence

- [ ] Make changes and save
- [ ] Refresh page
- [ ] Verify all saved data persists
- [ ] Sign out and sign back in
- [ ] Verify profile data is still there

### 14. Edge Cases

- [ ] Test with user who has no profile data (all null fields)
- [ ] Test with very long service names
- [ ] Test with special characters in names
- [ ] Test with future date of birth (should be caught by backend)
- [ ] Test rapid clicking of save button (should prevent duplicate requests)
- [ ] Test browser back/forward navigation

## Common Issues to Watch For

1. **CORS errors** - Check if backend allows frontend origin
2. **401 Unauthorized** - Check if token is being sent correctly
3. **Field mapping errors** - Verify snake_case vs camelCase conversion
4. **Image upload failures** - Check FormData handling and endpoint URL
5. **Validation errors** - Check if frontend and backend validation match
6. **Tab visibility** - Verify customer-only tabs don't show for other roles

## Browser Console Checks

- [ ] No JavaScript errors in console
- [ ] No React warnings
- [ ] No network errors (except intentional test cases)
- [ ] No CORS errors
- [ ] Check for any deprecation warnings

## Success Criteria

✅ All roles can access profile page  
✅ All fields can be edited and saved  
✅ Profile image upload works end-to-end  
✅ Validation works on frontend and backend  
✅ Error handling is user-friendly  
✅ Customer-specific features only show for customers  
✅ Data persists correctly  
✅ No console errors  

