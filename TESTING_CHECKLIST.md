# Testing Checklist - Dynamic OG Images

## 🧪 Local Testing

### 1. Start Development Server
```bash
netlify dev
```

### 2. Test OG Image Endpoints

#### Miner Template
```bash
# With username
curl -I http://localhost:8888/og-image?type=miner&id=bdoolittle

# With numeric ID
curl -I http://localhost:8888/og-image?type=miner&id=123456

# Open in browser
open http://localhost:8888/og-image?type=miner&id=bdoolittle
```

**Expected:** 
- ✅ 200 status code
- ✅ Content-Type: image/png
- ✅ Cache-Control: public, immutable, s-maxage=7200
- ✅ Image displays with avatar, rank, stats

#### Repository Template
```bash
# Test repo image
curl -I http://localhost:8888/og-image?type=repository&repo=opentensor/subtensor

# Open in browser
open http://localhost:8888/og-image?type=repository&repo=opentensor/subtensor
```

**Expected:**
- ✅ 200 status code
- ✅ Content-Type: image/png
- ✅ Image displays with owner avatar, stats

#### Home Template
```bash
# Test home image
curl -I http://localhost:8888/og-image

# Open in browser
open http://localhost:8888/og-image
```

**Expected:**
- ✅ 200 status code
- ✅ Cache-Control: public, immutable, s-maxage=86400
- ✅ Branded landing page design

### 3. Test Meta Tag Injection

#### Miner Details Page
```bash
# Visit page
open http://localhost:8888/miners/details?githubId=bdoolittle

# Check source
curl http://localhost:8888/miners/details?githubId=bdoolittle | grep og:image
```

**Expected in source:**
```html
<meta property="og:image" content="http://localhost:8888/og-image?type=miner&id=bdoolittle" />
<meta property="og:title" content="bdoolittle | Rank #X | Gittensor" />
<meta property="og:description" content="Rank #X • Score: XX.XX • XX PRs • ..." />
```

#### Repository Page
```bash
# Visit page
open http://localhost:8888/miners/repository?name=opentensor/subtensor

# Check source
curl http://localhost:8888/miners/repository?name=opentensor/subtensor | grep og:image
```

**Expected in source:**
```html
<meta property="og:image" content="http://localhost:8888/og-image?type=repository&repo=opentensor%2Fsubtensor" />
<meta property="og:title" content="subtensor | Gittensor" />
```

## 🚀 Production Testing

### 1. Deploy to Netlify
```bash
# Deploy
netlify deploy --prod

# Or via Git
git add .
git commit -m "Add dynamic OG images"
git push origin main
```

### 2. Verify Deployment
```bash
# Check function deployed
netlify functions:list

# Check logs
netlify functions:log og-image --lines 50
```

### 3. Test Production URLs

Replace `your-site.netlify.app` with your actual domain:

```bash
# Miner image
curl -I https://your-site.netlify.app/og-image?type=miner&id=bdoolittle

# Repository image
curl -I https://your-site.netlify.app/og-image?type=repository&repo=opentensor/subtensor

# Home image
curl -I https://your-site.netlify.app/og-image
```

## 🔍 Social Platform Testing

### Facebook Sharing Debugger
1. Visit: https://developers.facebook.com/tools/debug/
2. Enter URL: `https://your-site.netlify.app/miners/details?githubId=bdoolittle`
3. Click "Debug"
4. Check:
   - ✅ OG image displays correctly
   - ✅ Title and description are correct
   - ✅ Image dimensions: 1200 x 630
   - ✅ No errors or warnings

5. Click "Scrape Again" if needed to refresh cache

### Twitter/X Card Validator
1. Visit: https://cards-dev.twitter.com/validator
2. Enter URL: `https://your-site.netlify.app/miners/details?githubId=bdoolittle`
3. Click "Preview card"
4. Check:
   - ✅ Card type: summary_large_image
   - ✅ Image displays correctly
   - ✅ Title and description are correct

### LinkedIn Post Inspector
1. Visit: https://www.linkedin.com/post-inspector/
2. Enter URL: `https://your-site.netlify.app/miners/repository?name=opentensor/subtensor`
3. Click "Inspect"
4. Check:
   - ✅ Image displays correctly
   - ✅ All metadata is correct

### Generic OG Tester
1. Visit: https://www.opengraph.xyz/
2. Enter URL: `https://your-site.netlify.app/og-image?type=miner&id=bdoolittle`
3. Check preview across multiple platforms

## 📊 Performance Testing

### Test Response Times
```bash
# Use curl with timing
curl -o /dev/null -s -w "Time: %{time_total}s\n" \
  https://your-site.netlify.app/og-image?type=miner&id=bdoolittle

# Test multiple times to see caching
for i in {1..5}; do
  curl -o /dev/null -s -w "Request $i: %{time_total}s\n" \
    https://your-site.netlify.app/og-image?type=miner&id=bdoolittle
done
```

**Expected:**
- First request (cache miss): <1s
- Subsequent requests (cache hit): <100ms

### Test Image Sizes
```bash
# Check image file size
curl -s https://your-site.netlify.app/og-image?type=miner&id=bdoolittle -o test.png
ls -lh test.png
rm test.png
```

**Expected:**
- Miner images: 50-150KB
- Repository images: 75-200KB
- Home image: 40-100KB

## 🐛 Error Testing

### Test Missing Parameters
```bash
# Missing miner ID
curl -I http://localhost:8888/og-image?type=miner

# Missing repo name
curl -I http://localhost:8888/og-image?type=repository

# Invalid type
curl -I http://localhost:8888/og-image?type=invalid
```

**Expected:**
- 400 Bad Request for missing required params
- Fallback to home template for invalid type

### Test API Failures
```bash
# Non-existent miner
curl -I http://localhost:8888/og-image?type=miner&id=nonexistentuser999999

# Non-existent repo
curl -I http://localhost:8888/og-image?type=repository&repo=fake/nonexistent
```

**Expected:**
- Still generates image with fallback data
- 200 status code
- No crashes

## 📱 Visual Testing

### Desktop Testing
Test in multiple browsers:
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge

### Mobile Testing
Test how images appear in social feeds:
1. Share link in Twitter/X mobile app
2. Share link in Facebook mobile app
3. Share link in LinkedIn mobile app
4. Check Discord preview
5. Check Slack preview

### Things to Verify
- ✅ Text is readable at small sizes
- ✅ Images don't look pixelated
- ✅ Colors are consistent
- ✅ Layout doesn't break
- ✅ Stats are clearly visible

## 🔄 Cache Testing

### Test Cache Headers
```bash
# Check cache headers
curl -I https://your-site.netlify.app/og-image?type=miner&id=bdoolittle | grep -i cache

# Expected for miner/repo
# cache-control: public, immutable, s-maxage=7200, max-age=7200

# Expected for home
# cache-control: public, immutable, s-maxage=86400, max-age=86400
```

### Test Cache Invalidation
1. Note current stats on image
2. Wait or manually update backend data
3. Wait for cache to expire (2 hours for miner/repo)
4. Request image again
5. Verify stats updated

## 📈 Monitoring

### Check Function Logs
```bash
# Real-time logs
netlify functions:log og-image --stream

# Recent logs
netlify functions:log og-image --lines 100
```

### Things to Monitor
- Error rates
- Response times
- API failures
- Cache hit rates
- Memory usage

## ✅ Sign-Off Checklist

Before marking as complete:

- [ ] All three templates render correctly locally
- [ ] Meta tags inject dynamic OG image URLs
- [ ] Deployed to production successfully
- [ ] Tested with Facebook debugger - passes
- [ ] Tested with Twitter validator - passes
- [ ] Tested with LinkedIn inspector - passes
- [ ] Response times are acceptable (<1s)
- [ ] Image sizes are reasonable (<300KB)
- [ ] Error handling works (missing params, API failures)
- [ ] Cache headers are correct
- [ ] Mobile previews look good
- [ ] No console errors in logs
- [ ] Documentation is complete
- [ ] Team is trained on how to use/extend

## 🆘 Common Issues

### Issue: Image shows old data
**Solution:** Use social debugger tools to force cache refresh

### Issue: Image doesn't load
**Solution:** 
1. Check function logs for errors
2. Test image URL directly in browser
3. Verify API endpoints are accessible
4. Check network tab for CORS issues

### Issue: TypeScript errors in IDE
**Solution:** This is expected - ignore them. They work at runtime.

### Issue: Image too large
**Solution:** Check if API is returning too much data, optimize template

### Issue: Slow generation
**Solution:** 
1. Check API response times
2. Optimize template complexity
3. Verify edge function cold starts

## 📞 Support

If issues persist:
1. Check function logs: `netlify functions:log og-image`
2. Review `OG_IMAGES_README.md` for detailed documentation
3. Test with social platform debuggers
4. Verify deployment configuration in Netlify dashboard

---

**Happy Testing! 🎉**
