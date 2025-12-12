import { useEffect, useMemo, useState } from "react";
import { Star, Edit2, X, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "../../../shared/ui/button.jsx";
import { Textarea } from "../../../shared/ui/textarea.jsx";
import { uploadReviewImages, getReviewImages, getFullReview, refreshSignedUrl } from "../api.js";

const STAR_SCALE = [1, 2, 3, 4, 5];

// Helper function to get image URL - tries signed_url first, then url
function getImageUrl(img) {
  if (img?.signed_url) return img.signed_url;
  if (img?.url && (img.url.startsWith('http') || img.url.startsWith('//'))) return img.url;
  // If no signed_url, return null (should be handled by loadReviewImages refreshing URLs)
  return null;
}

export default function PostAppointmentReview({
  appointmentId,
  existingReview,
  salonName,
  employeeName,
  onSubmit,
}) {
  // Normalize review data - handle both old format (stars, text) and new format (rating, comment, id)
  const reviewId = existingReview?.id || existingReview?.review_id;
  const reviewRating = existingReview?.rating ?? existingReview?.stars ?? 0;
  const reviewComment = existingReview?.comment ?? existingReview?.text ?? "";
  
  const [isEditing, setIsEditing] = useState(false);
  const [savedReview, setSavedReview] = useState(existingReview ? { id: reviewId, stars: reviewRating, text: reviewComment } : null);
  const [rating, setRating] = useState(reviewRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(reviewComment);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success
  
  // Image upload state
  const [beforeImages, setBeforeImages] = useState([]);
  const [afterImages, setAfterImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    const reviewId = existingReview?.id || existingReview?.review_id;
    const reviewRating = existingReview?.rating ?? existingReview?.stars ?? 0;
    const reviewComment = existingReview?.comment ?? existingReview?.text ?? "";
    
    if (existingReview) {
      setSavedReview({ id: reviewId, stars: reviewRating, text: reviewComment });
      setRating(reviewRating);
      setComment(reviewComment);
      setStatus("success");
      setIsEditing(false);
      
      // Load existing images if review exists
      if (reviewId) {
        loadReviewImages(reviewId);
      }
    } else {
      setSavedReview(null);
      setRating(0);
      setComment("");
      setStatus("idle");
      setIsEditing(false);
      setBeforeImages([]);
      setAfterImages([]);
      setExistingImages([]);
    }
  }, [existingReview]);
  
  async function loadReviewImages(reviewId) {
    try {
      console.log("Loading review images for review ID:", reviewId);
      const images = await getReviewImages(reviewId);
      console.log("Loaded review images:", images);
      
      // Refresh signed URLs for images that don't have them
      if (images && images.length > 0) {
        const imagesWithUrls = await Promise.all(
          images.map(async (img) => {
            // If image already has signed_url, use it
            if (img.signed_url) {
              return img;
            }
            
            // Otherwise, fetch signed URL using refresh endpoint
            if (img.file_url) {
              try {
                console.log(`Refreshing signed URL for image: ${img.file_url}`);
                const result = await refreshSignedUrl(img.file_url, "review-images");
                return {
                  ...img,
                  signed_url: result.signed_url
                };
              } catch (err) {
                console.error(`Failed to refresh signed URL for ${img.file_url}:`, err);
                return img;
              }
            }
            
            return img;
          })
        );
        
        // Log each image's URL info
        imagesWithUrls.forEach((img, idx) => {
          console.log(`Image ${idx + 1}:`, {
            id: img.id,
            file_url: img.file_url,
            signed_url: img.signed_url,
            url: img.url,
            label: img.label
          });
        });
        
        setExistingImages(imagesWithUrls);
      } else {
        setExistingImages([]);
      }
    } catch (err) {
      console.error("Failed to load review images:", err);
      setExistingImages([]);
    }
  }

  const displayRating = hoverRating || rating;

  const heading = useMemo(() => {
    if (savedReview && !isEditing) return "Thanks for your feedback!";
    return "How was your visit?";
  }, [savedReview, isEditing]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "submitting") return;
    if (!rating) {
      setError("Please select a star rating.");
      return;
    }
    setError("");
    setStatus("submitting");
    try {
      const result = await onSubmit(appointmentId, { stars: rating, comment }, savedReview?.id);
      console.log("Review submission result:", result);
      
      // Extract review ID from result - check multiple possible fields
      let newReviewId = result?.id || result?.review_id || savedReview?.id;
      
      // If result is an array, get the first item
      if (Array.isArray(result) && result.length > 0) {
        newReviewId = result[0]?.id || result[0]?.review_id || newReviewId;
      }
      
      // Ensure review ID is a string
      if (newReviewId) {
        newReviewId = String(newReviewId);
      }
      
      if (!newReviewId) {
        console.error("No review ID found in result:", result);
        setError("Review submitted but could not get review ID. Images may not upload.");
        setStatus("idle");
        return;
      }
      
      console.log("Using review ID:", newReviewId, "Type:", typeof newReviewId);
      
      // Upload images if any were selected
      if (beforeImages.length > 0 || afterImages.length > 0) {
        const allFiles = [...beforeImages, ...afterImages];
        const allLabels = [
          ...beforeImages.map(() => "before"),
          ...afterImages.map(() => "after")
        ];
        
        console.log("Uploading images:", { reviewId: newReviewId, fileCount: allFiles.length, labels: allLabels });
        
        // Wait a bit to ensure review is committed to database, then verify it exists
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify review exists by trying to get it
        try {
          const fullReview = await getFullReview(newReviewId);
          console.log("Verified review exists:", fullReview?.id);
        } catch (verifyErr) {
          console.warn("Could not verify review exists, but proceeding with upload:", verifyErr);
        }
        
        try {
          const uploadResult = await uploadReviewImages(newReviewId, allFiles, allLabels);
          console.log("Image upload result:", uploadResult);
          
          // Reload images after upload to show them immediately
          await loadReviewImages(newReviewId);
        } catch (imgErr) {
          console.error("Failed to upload images:", imgErr);
          // Try once more after a longer delay
          try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log("Retrying image upload with review ID:", newReviewId);
            const uploadResult = await uploadReviewImages(newReviewId, allFiles, allLabels);
            console.log("Image upload result (retry):", uploadResult);
            await loadReviewImages(newReviewId);
          } catch (retryErr) {
            console.error("Failed to upload images on retry:", retryErr);
            setError(`Review submitted but image upload failed: ${retryErr?.message || "Unknown error"}. Please try editing the review to add images.`);
            // Don't fail the whole review submission if image upload fails
          }
        }
      } else if (savedReview?.id) {
        // If no new images but review exists, reload existing images
        await loadReviewImages(savedReview.id);
      }
      
      setSavedReview({ id: newReviewId, stars: rating, text: comment });
      setBeforeImages([]);
      setAfterImages([]);
      setStatus("success");
      setIsEditing(false);
      
      // Reload appointments after review and images are submitted (if callback provided)
      if (typeof onReviewSubmitted === 'function') {
        // Small delay to ensure backend has processed everything
        setTimeout(() => {
          onReviewSubmitted();
        }, 1000);
      }
    } catch (e) {
      console.error("Review submission error:", e);
      setStatus("idle");
      setError(e?.message || "Unable to submit review. Please try again.");
    }
  }
  
  function handleImageSelect(type, files) {
    const fileArray = Array.from(files);
    if (type === "before") {
      setBeforeImages(prev => [...prev, ...fileArray]);
    } else {
      setAfterImages(prev => [...prev, ...fileArray]);
    }
  }
  
  function removeImage(type, index) {
    if (type === "before") {
      setBeforeImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setAfterImages(prev => prev.filter((_, i) => i !== index));
    }
  }
  
  function removeExistingImage(imageId) {
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  }
  
  function createImagePreview(file) {
    return URL.createObjectURL(file);
  }

  if (savedReview && !isEditing) {
    const allImages = existingImages || [];
    const beforeImgs = allImages.filter(img => img.label === "before" || img.type === "before");
    const afterImgs = allImages.filter(img => img.label === "after" || img.type === "after");
    
    // Also check if images are in existingReview
    const reviewImages = existingReview?.images || [];
    const reviewBeforeImgs = reviewImages.filter(img => img.label === "before" || img.type === "before");
    const reviewAfterImgs = reviewImages.filter(img => img.label === "after" || img.type === "after");
    
    // Combine both sources and deduplicate by ID
    const combineAndDedupe = (arr1, arr2) => {
      const seen = new Set();
      const result = [];
      [...arr1, ...arr2].forEach(img => {
        const id = img.id || img.file_url;
        if (id && !seen.has(id)) {
          seen.add(id);
          result.push(img);
        }
      });
      return result;
    };
    
    const allBeforeImgs = combineAndDedupe(beforeImgs, reviewBeforeImgs);
    const allAfterImgs = combineAndDedupe(afterImgs, reviewAfterImgs);
    
    return (
      <>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <StarRow value={savedReview.stars} readOnly />
              <span className="text-sm text-gray-600">
                You rated {salonName} {savedReview.stars} out of 5.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(true);
                // Reload images when editing
                if (savedReview?.id) {
                  loadReviewImages(savedReview.id);
                }
              }}
              className="flex items-center gap-2"
            >
              <Edit2 className="size-4" />
              Edit
            </Button>
          </div>
          {savedReview.text ? (
            <p className="mt-3 text-sm leading-6 text-gray-700">{savedReview.text}</p>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No written feedback provided.</p>
          )}
          
          {/* Display existing images */}
          {(allBeforeImgs.length > 0 || allAfterImgs.length > 0) && (
            <div className="mt-4 flex flex-col md:flex-row gap-4">
              {allBeforeImgs.length > 0 && (
                <div className="flex-1">
                  <h4 className="text-xs font-medium text-gray-600 mb-2">Before</h4>
                  <div className="flex gap-2 flex-wrap">
                    {allBeforeImgs.map((img, idx) => (
                      <div key={`before-${img.id || img.file_url || idx}-${idx}`} className="relative group">
                        <img
                          src={getImageUrl(img) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='}
                          alt="Before"
                          className="h-48 w-48 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                        onClick={() => {
                          const url = getImageUrl(img);
                          if (url) window.open(url, "_blank");
                        }}
                          onError={(e) => {
                            console.error("Image failed to load:", {
                              id: img.id,
                              file_url: img.file_url,
                              signed_url: img.signed_url,
                              url: img.url,
                              fullImage: img
                            });
                            // Show placeholder
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {allAfterImgs.length > 0 && (
                <div className="flex-1">
                  <h4 className="text-xs font-medium text-gray-600 mb-2">After</h4>
                  <div className="flex gap-2 flex-wrap">
                    {allAfterImgs.map((img, idx) => (
                      <div key={`after-${img.id || img.file_url || idx}-${idx}`} className="relative group">
                        <img
                          src={getImageUrl(img) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='}
                          alt="After"
                          className="h-48 w-48 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                        onClick={() => {
                          const url = getImageUrl(img);
                          if (url) window.open(url, "_blank");
                        }}
                          onError={(e) => {
                            console.error("Image failed to load:", {
                              id: img.id,
                              file_url: img.file_url,
                              signed_url: img.signed_url,
                              url: img.url,
                              fullImage: img
                            });
                            // Show placeholder
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5"
    >
      <div>
        <h3 className="text-base font-semibold text-gray-900">{heading}</h3>
        <p className="text-sm text-gray-600">
          Tell us about your appointment with {employeeName} at {salonName}.
        </p>
      </div>

      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHoverRating(0)}
      >
        {STAR_SCALE.map((star) => {
          const active = star <= displayRating;
          return (
            <button
              key={star}
              type="button"
              className="rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              onMouseEnter={() => setHoverRating(star)}
              onFocus={() => setHoverRating(star)}
              onClick={() => {
                setRating(star);
                setHoverRating(0);
              }}
            >
              <Star
                className={`size-6 ${active ? "text-amber-500" : "text-gray-300"}`}
                fill={active ? "currentColor" : "none"}
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="sr-only">{`${star} star${star > 1 ? "s" : ""}`}</span>
            </button>
          );
        })}
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share anything that stood out during your visit…"
        maxLength={1000}
      />

      {/* Before/After Image Upload */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-2 flex flex-col">
            <label className="text-sm font-medium text-gray-700 text-center">Before Photos</label>
            <label className="h-80 w-full max-w-md border-2 border-dashed border-gray-300 rounded-lg grid grid-cols-2 gap-1 p-1 cursor-pointer hover:border-gray-400 transition relative overflow-hidden">
              {/* Show existing before images */}
              {existingImages.filter(img => img.label === "before" || img.type === "before").map((img, idx) => (
                <div 
                  key={`existing-before-${img.id || img.file_url || idx}-${idx}`} 
                  className="relative group"
                >
                  <img
                    src={getImageUrl(img) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='}
                    alt="Before"
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      console.error("Existing before image failed to load:", {
                        id: img.id,
                        file_url: img.file_url,
                        signed_url: img.signed_url,
                        url: img.url
                      });
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                </div>
              ))}
              {/* Show newly selected before images */}
              {beforeImages.map((file, idx) => (
                <div 
                  key={`new-${idx}`} 
                  className={`relative group ${beforeImages.length === 1 && existingImages.filter(img => img.label === "before" || img.type === "before").length === 0 ? 'col-span-2' : ''}`}
                >
                  <img
                    src={createImagePreview(file)}
                    alt={`Before ${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage("before", idx);
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition z-10"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {(beforeImages.length === 0 && existingImages.filter(img => img.label === "before" || img.type === "before").length === 0) && (
                <div className="col-span-2 flex items-center justify-center h-full">
                  <Upload className="size-24 text-gray-400" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageSelect("before", e.target.files)}
              />
            </label>
          </div>

          <div className="flex-1 space-y-2 flex flex-col">
            <label className="text-sm font-medium text-gray-700 text-center">After Photos</label>
            <label className="h-80 w-full max-w-md border-2 border-dashed border-gray-300 rounded-lg grid grid-cols-2 gap-1 p-1 cursor-pointer hover:border-gray-400 transition relative overflow-hidden">
              {/* Show existing after images */}
              {existingImages.filter(img => img.label === "after" || img.type === "after").map((img, idx) => (
                <div 
                  key={`existing-after-${img.id || img.file_url || idx}-${idx}`} 
                  className="relative group"
                >
                  <img
                    src={getImageUrl(img) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='}
                    alt="After"
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      console.error("Existing after image failed to load:", {
                        id: img.id,
                        file_url: img.file_url,
                        signed_url: img.signed_url,
                        url: img.url
                      });
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                </div>
              ))}
              {/* Show newly selected after images */}
              {afterImages.map((file, idx) => (
                <div 
                  key={`new-${idx}`} 
                  className={`relative group ${afterImages.length === 1 && existingImages.filter(img => img.label === "after" || img.type === "after").length === 0 ? 'col-span-2' : ''}`}
                >
                  <img
                    src={createImagePreview(file)}
                    alt={`After ${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage("after", idx);
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition z-10"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {(afterImages.length === 0 && existingImages.filter(img => img.label === "after" || img.type === "after").length === 0) && (
                <div className="col-span-2 flex items-center justify-center h-full">
                  <Upload className="size-24 text-gray-400" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageSelect("after", e.target.files)}
              />
            </label>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-between">
        {status === "success" ? (
          <span className="text-sm text-emerald-600">Review saved!</span>
        ) : (
          <span className="text-sm text-gray-500">
            Your rating helps other customers choose their stylist.
          </span>
        )}
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setRating(savedReview?.stars ?? 0);
                setComment(savedReview?.text ?? "");
                setError("");
              }}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Saving…" : isEditing ? "Update review" : "Submit review"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function StarRow({ value, readOnly = false }) {
  return (
    <div className="flex items-center gap-1">
      {STAR_SCALE.map((star) => {
        const active = star <= value;
        return (
          <Star
            key={star}
            className={`size-5 ${active ? "text-amber-500" : "text-gray-300"}`}
            fill={active ? "currentColor" : "none"}
            strokeWidth={1.8}
            aria-hidden={readOnly}
          />
        );
      })}
    </div>
  );
}

