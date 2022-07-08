# Simple website comparison

This goes through a website and generates screenshots for all pages

usage:

```
website-compare --url <url> --output <output directory> [--allImages] [--totalPages number]
```

It goes through all the pages found under the url, takes screenshots and writes to the output directory.
Set total pages to a number to restrict the pages.
Set allImages in order to capture all the images, otherwise images are not downloaded.
