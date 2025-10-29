// API Base URL
const API_BASE_URL = 'http://127.0.0.1:5000/api/hidden-spots';

// Toast notification function
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show';
    
    if (type === 'error') {
        toast.style.background = '#ef4444';
    } else {
        toast.style.background = '#0ea5e9'; 
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Add Spot Page Functionality
if (document.getElementById('submitBtn')) {
    const submitBtn = document.getElementById('submitBtn');
    const spotName = document.getElementById('spotName');
    const spotDescription = document.getElementById('spotDescription');
    const spotLocation = document.getElementById('spotLocation');
    const spotImageFile = document.getElementById('spotImageFile'); 

    submitBtn.addEventListener('click', async () => {
        if (!spotName.value.trim() || !spotDescription.value.trim() || !spotLocation.value.trim()) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('name', spotName.value.trim());
        formData.append('description', spotDescription.value.trim());
        formData.append('location', spotLocation.value.trim());
        
        if (spotImageFile.files.length > 0) {
            formData.append('image', spotImageFile.files[0]);
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
            </svg>
            Submitting...
        `;

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                showToast('🎉 Spot added successfully!', 'success');
                
                spotName.value = '';
                spotDescription.value = '';
                spotLocation.value = '';
                spotImageFile.value = '';
                
                setTimeout(() => {
                    window.location.href = 'explore.html';
                }, 2000);
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to add spot. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error adding spot:', error);
            showToast('Cannot connect to server. Make sure Flask is running!', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Submit Spot
            `;
        }
    });

    document.getElementById('spotForm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            submitBtn.click();
        }
    });
}

// Explore Page Functionality
if (document.getElementById('spotsGrid')) {
    const spotsGrid = document.getElementById('spotsGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    const refreshBtn = document.getElementById('refreshBtn');

    // Function to create star rating display
    function createStarRating(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                stars += '⭐';
            } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
                stars += '⭐'; // Half star shown as full for simplicity
            } else {
                stars += '☆';
            }
        }
        return stars;
    }

    // Function to create a spot card
    function createSpotCard(spot) {
        const card = document.createElement('div');
        card.className = 'spot-card';
        
        const imageUrl = spot.imageUrl || spot.image_url;
        const avgRating = spot.avgRating || 0;
        const reviewCount = spot.reviewCount || 0;
        
        card.innerHTML = `
            <div class="spot-image">
                ${imageUrl ? 
                    `<img src="http://127.0.0.1:5000${imageUrl}" alt="${spot.name}" onerror="this.parentElement.innerHTML='<svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><path d=\\'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\\'></path><circle cx=\\'12\\' cy=\\'10\\' r=\\'3\\'></circle></svg>'">` 
                    : 
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>`
                }
            </div>
            <div class="spot-content">
                <h3 class="spot-title">${escapeHtml(spot.name)}</h3>
                <div class="spot-location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    ${escapeHtml(spot.location)}
                </div>
                <p class="spot-description">${escapeHtml(spot.description)}</p>
                <div class="spot-rating">
                    <span class="stars">${createStarRating(avgRating)}</span>
                    <span class="rating-text">${avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'} ${reviewCount > 0 ? `(${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})` : ''}</span>
                </div>
                <button class="btn btn-secondary btn-small" onclick="openReviewModal(${spot.id}, '${escapeHtml(spot.name)}')">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    View Reviews
                </button>
            </div>
        `;
        
        return card;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function fetchSpots() {
        loadingSpinner.style.display = 'block';
        emptyState.classList.remove('show');
        spotsGrid.innerHTML = '';

        try {
            const response = await fetch(API_BASE_URL);
            
            if (response.ok) {
                const spots = await response.json();
                
                loadingSpinner.style.display = 'none';
                
                if (spots.length === 0) {
                    emptyState.classList.add('show');
                } else {
                    spots.forEach((spot, index) => {
                        const card = createSpotCard(spot);
                        card.style.animationDelay = `${index * 0.1}s`;
                        spotsGrid.appendChild(card);
                    });
                }
            } else {
                throw new Error('Failed to fetch spots');
            }
        } catch (error) {
            console.error('Error fetching spots:', error);
            loadingSpinner.style.display = 'none';
            
            spotsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <p style="color: #ef4444; font-size: 1.125rem;">
                        Cannot connect to server. Make sure Flask is running on port 5000!
                    </p>
                </div>
            `;
        }
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchSpots);
    }

    fetchSpots();
}

// Review Modal Functions (Global scope)
window.openReviewModal = async function(spotId, spotName) {
    const modal = document.getElementById('reviewModal');
    const modalTitle = document.getElementById('modalSpotName');
    const reviewsList = document.getElementById('reviewsList');
    
    modalTitle.textContent = spotName;
    modal.style.display = 'flex';
    
    // Store spotId for later use
    modal.dataset.spotId = spotId;
    
    // Fetch and display reviews
    try {
        reviewsList.innerHTML = '<p style="text-align: center; color: #6b7280;">Loading reviews...</p>';
        
        const response = await fetch(`${API_BASE_URL}/${spotId}/reviews`);
        if (response.ok) {
            const reviews = await response.json();
            
            if (reviews.length === 0) {
                reviewsList.innerHTML = '<p style="text-align: center; color: #6b7280;">No reviews yet. Be the first to review!</p>';
            } else {
                reviewsList.innerHTML = reviews.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <strong>${escapeHtml(review.userName)}</strong>
                            <span class="review-stars">${'⭐'.repeat(review.rating)}</span>
                        </div>
                        <p class="review-comment">${escapeHtml(review.comment)}</p>
                        <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error fetching reviews:', error);
        reviewsList.innerHTML = '<p style="text-align: center; color: #ef4444;">Failed to load reviews</p>';
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.closeReviewModal = function() {
    const modal = document.getElementById('reviewModal');
    modal.style.display = 'none';
};

window.submitReview = async function() {
    const modal = document.getElementById('reviewModal');
    const spotId = modal.dataset.spotId;
    const userName = document.getElementById('reviewUserName').value.trim();
    const rating = parseInt(document.getElementById('reviewRating').value);
    const comment = document.getElementById('reviewComment').value.trim();
    
    if (!userName || !rating || !comment) {
        showToast('Please fill in all review fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/${spotId}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_name: userName,
                rating: rating,
                comment: comment
            })
        });
        
        if (response.ok) {
            showToast('✅ Review added successfully!', 'success');
            
            // Clear form
            document.getElementById('reviewUserName').value = '';
            document.getElementById('reviewRating').value = '5';
            document.getElementById('reviewComment').value = '';
            
            // Refresh reviews
            const spotName = document.getElementById('modalSpotName').textContent;
            await openReviewModal(spotId, spotName);
            
            // Refresh spots to show updated rating
            if (document.getElementById('spotsGrid')) {
                const spotsGrid = document.getElementById('spotsGrid');
                const loadingSpinner = document.getElementById('loadingSpinner');
                const emptyState = document.getElementById('emptyState');
                
                // Re-fetch spots silently
                setTimeout(async () => {
                    const response = await fetch(API_BASE_URL);
                    if (response.ok) {
                        const spots = await response.json();
                        spotsGrid.innerHTML = '';
                        spots.forEach((spot, index) => {
                            const card = createSpotCard(spot);
                            spotsGrid.appendChild(card);
                        });
                    }
                }, 1000);
            }
        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'Failed to add review', 'error');
        }
    } catch (error) {
        console.error('Error adding review:', error);
        showToast('Failed to add review', 'error');
    }
};

// Helper function for creating spot cards (needed for refresh)
function createSpotCard(spot) {
    const card = document.createElement('div');
    card.className = 'spot-card';
    
    const imageUrl = spot.imageUrl || spot.image_url;
    const avgRating = spot.avgRating || 0;
    const reviewCount = spot.reviewCount || 0;
    
    function createStarRating(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= Math.floor(rating) ? '⭐' : '☆';
        }
        return stars;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    card.innerHTML = `
        <div class="spot-image">
            ${imageUrl ? 
                `<img src="http://127.0.0.1:5000${imageUrl}" alt="${spot.name}">` 
                : 
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>`
            }
        </div>
        <div class="spot-content">
            <h3 class="spot-title">${escapeHtml(spot.name)}</h3>
            <div class="spot-location">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${escapeHtml(spot.location)}
            </div>
            <p class="spot-description">${escapeHtml(spot.description)}</p>
            <div class="spot-rating">
                <span class="stars">${createStarRating(avgRating)}</span>
                <span class="rating-text">${avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'} ${reviewCount > 0 ? `(${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})` : ''}</span>
            </div>
            <button class="btn btn-secondary btn-small" onclick="openReviewModal(${spot.id}, '${escapeHtml(spot.name)}')">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                View Reviews
            </button>
        </div>
    `;
    
    return card;
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Console welcome message
console.log('%cWelcome to Ferd! 🗺️', 'color: #0ea5e9; font-size: 24px; font-weight: bold;');
console.log('%cDiscover and share hidden gems around you', 'color: #6b7280; font-size: 14px;');