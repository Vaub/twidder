# Twidder

Project for the course TDDD97 at Linköpings Universitet. This implements a small "twitter-like" social network using a minimal amount of JavaScript libraries with a backend in Flask.

*This project mostly focus on backend/frontend interaction. The UI was a second thought and might lack compatibility with older browser / different configurations. (mostly tested under Chrome and Firefox)*

## Project

### Libraries
- Page.js (for the routing)
- Chart.js (for the statistics)
- Handlebars.js (for the templating)
- SJCL (for client-side HMAC)

### HMAC security
This project uses Hmac to "secure" it's API calls. Since the secret key is given when the page is requested, it is "useless" under HTTP

## Build
### Requirements
- Python 2.7+
- Bower (will require Node.js)

### Deploy
Suggested deployment under Docker
```bash
docker build -t twidder .
docker run -p 5000:5000 -d twidder  # for port 5000
```

## Authors
Isabelle Chum-Chhin  
Vincent Aubé
