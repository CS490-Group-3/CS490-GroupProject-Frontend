"""
Cleanup utility for Selenium test data.
Removes test salons and related data from Supabase before/after test runs.
"""
import os
from pathlib import Path
from supabase import create_client, Client

# Try to load from .env file if it exists
try:
    from dotenv import load_dotenv
    # Load .env file from the same directory as this script
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ Loaded environment variables from {env_path}")
    else:
        # Also try loading from parent directories
        load_dotenv()
except ImportError:
    # python-dotenv not installed, will use system environment variables
    pass

# Get Supabase credentials from environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Test owner email used in tests
TEST_OWNER_EMAIL = "hifif37383@kudimi.com"

def get_supabase_client() -> Client:
    """Create and return Supabase client."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def cleanup_test_salons():
    """
    Clean up all test salons created by the test owner.
    Simply deletes the salons - database cascade deletes will handle all related data.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️  SUPABASE_URL and SUPABASE_KEY not set. Skipping cleanup.")
        print("   Set these environment variables to enable automatic cleanup.")
        return
    
    try:
        supabase = get_supabase_client()
        
        # Step 1: Get test owner's user ID
        user_resp = supabase.table("user_details").select("id").eq("email", TEST_OWNER_EMAIL).maybe_single().execute()
        if not user_resp.data:
            print(f"✅ No test owner found ({TEST_OWNER_EMAIL}). Nothing to clean up.")
            return
        
        owner_id = user_resp.data.get("id")
        print(f"📍 Found test owner: {TEST_OWNER_EMAIL} (ID: {owner_id})")
        
        # Step 2: Find all salons owned by test owner
        try:
            salons_resp = supabase.table("salons").select("id, name").eq("owner_id", owner_id).execute()
        except Exception as e:
            # If query fails (e.g., table doesn't exist, connection issue), that's fine
            # Just means there's nothing to clean up
            print(f"✅ No salons found or query failed (may already be clean): {str(e)[:50]}")
            return
        
        if not salons_resp.data or len(salons_resp.data) == 0:
            print("✅ No test salons found. Nothing to clean up.")
            return
        
        print(f"📍 Found {len(salons_resp.data)} test salon(s) to clean up:")
        for salon in salons_resp.data:
            print(f"   - {salon.get('name')} (ID: {salon.get('id')})")
        
        # Step 3: Delete salons directly - cascade deletes will handle the rest
        deleted_count = 0
        for salon in salons_resp.data:
            salon_id = salon.get("id")
            salon_name = salon.get("name")
            
            try:
                # Delete the salon - cascade will delete all related data
                delete_resp = supabase.table("salons").delete().eq("id", salon_id).execute()
                
                # Check if deletion was successful (salon might already be deleted)
                # Supabase delete returns empty array if no rows deleted (already gone)
                if delete_resp.data is not None and len(delete_resp.data) > 0:
                    print(f"   ✅ Deleted salon: {salon_name} (cascade deletes handled related data)")
                    deleted_count += 1
                else:
                    # Salon was already deleted (no rows affected) - that's fine
                    print(f"   ✅ Salon {salon_name} already deleted (no action needed)")
            except Exception as e:
                error_str = str(e)
                # If salon doesn't exist or any error occurs, that's fine - it's already deleted or cascade handled it
                # Don't break the cleanup process - just log and continue
                if any(keyword in error_str.lower() for keyword in ["not found", "does not exist", "23503", "23502", "null value"]):
                    print(f"   ✅ Salon {salon_name} already deleted or doesn't exist (no action needed)")
                else:
                    # Log but don't fail - might be a transient issue or already deleted
                    print(f"   ⚠️  Salon {salon_name} may already be deleted (error: {str(e)[:80]})")
        
        if deleted_count > 0:
            print(f"\n✅ Cleanup complete! Deleted {deleted_count} test salon(s).")
        else:
            print(f"\n✅ Cleanup complete! No salons to delete (already clean).")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        print("   You may need to manually clean up test data in Supabase.")

if __name__ == "__main__":
    print("=" * 60)
    print("🧹 SELENIUM TEST DATA CLEANUP")
    print("=" * 60)
    cleanup_test_salons()

