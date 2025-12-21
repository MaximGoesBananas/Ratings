# Maxim's Ratings - Updated with List View

## Changes Made

This update converts **Mice** and **Mousepads** sections from card/grid view to a clean list view while keeping all functionality intact.

### What Changed:

1. **index.html**: Changed containers for mice and mousepads from `cards-container` to `list-container`

2. **script.js**: 
   - Added `isListView: true` flag to mice and mousepads categories
   - Created new `buildListItem()` function to render list rows
   - Modified `renderCategory()` to check category type and render accordingly

3. **styles.css**: 
   - Added `.list-container` styles for list layout
   - Added `.list-item` styles for individual rows
   - Added `.list-item-info`, `.list-item-title`, `.list-item-details` for content
   - Added `.list-item-meta` and `.list-score-badge` for score and rated link
   - Added responsive styles for mobile

### Features Preserved:

✅ All filtering (score range, year, search) works exactly the same
✅ All sorting (latest, top rated, recently rated) works exactly the same
✅ Score badges with dynamic colors and stars
✅ "Rated" links to Google Sheet rows
✅ Loading states
✅ Responsive design
✅ Movies and Games remain in card view

### List View Design:

- Each item is displayed as a single row
- Title and details on the left
- Score badge and "Rated" link on the right
- Hover effects for better UX
- Mobile-responsive (stacks vertically on small screens)
