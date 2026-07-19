# Maxim's Ratings

My personal ratings for movies, games, gaming mice, and mousepads.

**Live site:** [maximsratings.com](https://maximsratings.com)

Ratings are maintained in Google Sheets and loaded when the site opens. Movie
and game posters use the URLs stored in the sheet, while product images live in
[`assets/mice`](assets/mice) and [`assets/mousepads`](assets/mousepads).

The site is plain HTML, CSS, and JavaScript hosted with GitHub Pages. There is
no build step.

## Local preview

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Matväljaren

This repository also hosts [Matväljaren](https://maximsratings.com/mat/), a
small Swedish recipe picker.
