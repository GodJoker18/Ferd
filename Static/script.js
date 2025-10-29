// API Base URL - UPDATED to point to Flask backend
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
        // Validate required fields
        if (!spotName.value.trim() || !spotDescription.value.trim() || !spotLocation.value.trim()) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        // Prepare data using FormData for file upload
        const formData = new FormData();
        formData.append('name', spotName.value.trim());
        formData.append('description', spotDescription.value.trim());
        formData.append('location', spotLocation.value.trim());
        
        // Append the file if one was selected
        if (spotImageFile.files.length > 0) {
            formData.append('image', spotImageFile.files[0]);
        }

        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
            </svg>
            Submitting...
        `;

        try {
            console.log('Sending request to:', API_BASE_URL);
            
            // Send POST request to Flask backend
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                body: formData
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                showToast('🎉 Spot added successfully!', 'success');
                
                // Clear form
                spotName.value = '';
                spotDescription.value = '';
                spotLocation.value = '';
                spotImageFile.value = '';
                
                // Redirect to explore page after 2 seconds
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
            // Re-enable button
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

    // Allow form submission with Enter key (except in textarea)
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

    // Function to create a spot card
    function createSpotCard(spot) {
        const card = document.createElement('div');
        card.className = 'spot-card';
        
        const imageUrl = spot.imageUrl || spot.image_url;
        
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
            </div>
        `;
        
        return card;
    }

    // Function to escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Function to fetch and display spots
    async function fetchSpots() {
        loadingSpinner.style.display = 'block';
        emptyState.classList.remove('show');
        spotsGrid.innerHTML = '';

        try {
            console.log('Fetching spots from:', API_BASE_URL);
            const response = await fetch(API_BASE_URL);
            
            if (response.ok) {
                const spots = await response.json();
                console.log('Fetched spots:', spots);
                
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

    // Refresh button functionality
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchSpots);
    }

    // Initial fetch
    fetchSpots();
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

// Add fade-in animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all feature cards and spot cards
document.querySelectorAll('.feature-card, .spot-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// Console welcome message
console.log('%cWelcome to Ferd! 🗺️', 'color: #0ea5e9; font-size: 24px; font-weight: bold;');
console.log('%cDiscover and share hidden gems around you', 'color: #6b7280; font-size: 14px;');