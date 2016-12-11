# asyncwebcrawler

This nodejs script takes a site url and csv file as input to recursively crawl the site for hyperlinks until they are exhausted. All hyperlinks found are stored in given csv file.

To install dependencies, use:
```
npm install
```

To run script with `async` library, use:
```
node asyncwebcrawler.js <site url> <csv file> 
```

Example:
```
node asyncwebcrawler.js https://www.google.com hyperlinks.csv
```

To run script without `async` library, use:
```
node basicnodewebcrawler.js <site url> <csv file> 
```

Example:
```
node basicnodewebcrawler.js https://www.google.com hyperlinks.csv
```