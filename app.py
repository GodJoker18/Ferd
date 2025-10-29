import os
import sqlite3
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'

# Configure file uploads
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Enable CORS for all routes
CORS(app)

# Database configuration
DATABASE = 'ferd.db'


def get_db_connection():
    """Create and return a database connection."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn


def create_db():
    """Initialize the database and create tables if they don't exist."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Create spots table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS spots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            location TEXT NOT NULL,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create reviews table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spot_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (spot_id) REFERENCES spots (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully!")


def allowed_file(filename):
    """Check if the uploaded file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# Initialize database on startup
create_db()

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# =============================================================================
# PAGE ROUTES - Serve HTML Templates
# =============================================================================

@app.route('/')
def home():
    """Render the home page."""
    return render_template('index.html')


@app.route('/add')
def add_spot_page():
    """Render the add spot page."""
    return render_template('add.html')


@app.route('/explore')
def explore_page():
    """Render the explore spots page."""
    return render_template('explore.html')


@app.route('/about')
def about_page():
    """Render the about page."""
    return render_template('about.html')


# =============================================================================
# API ROUTES - Handle Data Operations
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify server is running."""
    return jsonify({
        'status': 'ok',
        'message': 'Ferd API is running!',
        'timestamp': datetime.now().isoformat()
    }), 200


@app.route('/api/hidden-spots', methods=['GET'])
def get_spots():
    """
    GET endpoint to retrieve all hidden spots with their average ratings.
    Returns: JSON array of spot objects
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Fetch all spots with average rating and review count
        cursor.execute('''
            SELECT 
                s.id, 
                s.name, 
                s.description, 
                s.location, 
                s.image_url, 
                s.created_at,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(r.id) as review_count
            FROM spots s
            LEFT JOIN reviews r ON s.id = r.spot_id
            GROUP BY s.id
            ORDER BY s.created_at DESC
        ''')
        
        spots = cursor.fetchall()
        conn.close()
        
        # Convert rows to list of dictionaries
        spots_list = []
        for spot in spots:
            spots_list.append({
                'id': spot['id'],
                'name': spot['name'],
                'description': spot['description'],
                'location': spot['location'],
                'imageUrl': spot['image_url'],
                'createdAt': spot['created_at'],
                'avgRating': round(spot['avg_rating'], 1),
                'reviewCount': spot['review_count']
            })
        
        return jsonify(spots_list), 200
    
    except Exception as e:
        print(f"Error fetching spots: {str(e)}")
        return jsonify({'error': 'Failed to fetch spots'}), 500


@app.route('/api/hidden-spots', methods=['POST'])
def add_spot():
    """
    POST endpoint to add a new hidden spot.
    Accepts: multipart/form-data with name, description, location, and optional image file
    Returns: JSON success message
    """
    try:
        # Log incoming request for debugging
        print("📥 Received POST request to /api/hidden-spots")
        print(f"Content-Type: {request.content_type}")
        print(f"Form data: {request.form}")
        print(f"Files: {request.files}")
        
        # Extract form data
        name = request.form.get('name')
        description = request.form.get('description')
        location = request.form.get('location')
        
        print(f"Name: {name}, Description: {description}, Location: {location}")
        
        # Validate required fields
        if not name or not description or not location:
            return jsonify({
                'error': 'Missing required fields',
                'message': 'Name, description, and location are required'
            }), 400
        
        # Handle image upload
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            print(f"File received: {file.filename}")
            
            # Check if file is valid
            if file and file.filename and allowed_file(file.filename):
                # Generate secure filename
                filename = secure_filename(file.filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"{timestamp}_{filename}"
                
                # Save file
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                
                # Store relative URL for frontend
                image_url = f"/static/uploads/{filename}"
                print(f"✅ Image saved: {image_url}")
        
        # Insert spot into database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO spots (name, description, location, image_url)
            VALUES (?, ?, ?, ?)
        ''', (name, description, location, image_url))
        
        conn.commit()
        spot_id = cursor.lastrowid
        conn.close()
        
        print(f"✅ Spot added successfully! ID: {spot_id}")
        
        return jsonify({
            'message': 'Spot added successfully!',
            'id': spot_id,
            'name': name,
            'location': location
        }), 201
    
    except Exception as e:
        print(f"❌ Error adding spot: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to add spot',
            'message': str(e)
        }), 500


@app.route('/api/hidden-spots/<int:spot_id>/reviews', methods=['GET'])
def get_reviews(spot_id):
    """
    GET endpoint to retrieve all reviews for a specific spot.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, user_name, rating, comment, created_at
            FROM reviews
            WHERE spot_id = ?
            ORDER BY created_at DESC
        ''', (spot_id,))
        
        reviews = cursor.fetchall()
        conn.close()
        
        reviews_list = []
        for review in reviews:
            reviews_list.append({
                'id': review['id'],
                'userName': review['user_name'],
                'rating': review['rating'],
                'comment': review['comment'],
                'createdAt': review['created_at']
            })
        
        return jsonify(reviews_list), 200
    
    except Exception as e:
        print(f"Error fetching reviews: {str(e)}")
        return jsonify({'error': 'Failed to fetch reviews'}), 500


@app.route('/api/hidden-spots/<int:spot_id>/reviews', methods=['POST'])
def add_review(spot_id):
    """
    POST endpoint to add a review for a specific spot.
    Accepts: JSON with user_name, rating, and comment
    """
    try:
        data = request.get_json()
        
        user_name = data.get('user_name')
        rating = data.get('rating')
        comment = data.get('comment')
        
        # Validate required fields
        if not user_name or not rating or not comment:
            return jsonify({
                'error': 'Missing required fields',
                'message': 'User name, rating, and comment are required'
            }), 400
        
        # Validate rating range
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({
                'error': 'Invalid rating',
                'message': 'Rating must be between 1 and 5'
            }), 400
        
        # Check if spot exists
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM spots WHERE id = ?', (spot_id,))
        spot = cursor.fetchone()
        
        if not spot:
            conn.close()
            return jsonify({'error': 'Spot not found'}), 404
        
        # Insert review
        cursor.execute('''
            INSERT INTO reviews (spot_id, user_name, rating, comment)
            VALUES (?, ?, ?, ?)
        ''', (spot_id, user_name, rating, comment))
        
        conn.commit()
        review_id = cursor.lastrowid
        conn.close()
        
        print(f"✅ Review added successfully! ID: {review_id}")
        
        return jsonify({
            'message': 'Review added successfully!',
            'id': review_id
        }), 201
    
    except Exception as e:
        print(f"Error adding review: {str(e)}")
        return jsonify({'error': 'Failed to add review'}), 500


@app.route('/api/hidden-spots/<int:spot_id>', methods=['DELETE'])
def delete_spot(spot_id):
    """
    DELETE endpoint to remove a spot by ID (optional feature).
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if spot exists
        cursor.execute('SELECT * FROM spots WHERE id = ?', (spot_id,))
        spot = cursor.fetchone()
        
        if not spot:
            conn.close()
            return jsonify({'error': 'Spot not found'}), 404
        
        # Delete the spot (reviews will be deleted automatically due to CASCADE)
        cursor.execute('DELETE FROM spots WHERE id = ?', (spot_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Spot deleted successfully'}), 200
    
    except Exception as e:
        print(f"Error deleting spot: {str(e)}")
        return jsonify({'error': 'Failed to delete spot'}), 500


# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({'error': 'Resource not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({'error': 'Internal server error'}), 500


# =============================================================================
# RUN APPLICATION
# =============================================================================

if __name__ == '__main__':
    print("🚀 Starting Ferd Flask Backend...")
    print("📂 Database:", DATABASE)
    print("📁 Upload folder:", UPLOAD_FOLDER)
    print("🌐 Server running on: http://127.0.0.1:5000")
    print("=" * 50)
    
    # Run Flask development server
    app.run(debug=True, host='0.0.0.0', port=5000)