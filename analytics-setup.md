# Analytics Setup for protolint.com

## Google Analytics 4 Integration

### Step 1: Create GA4 Property

1. Go to https://analytics.google.com
2. Create new property for "protolint.com"
3. Get your Measurement ID (format: G-XXXXXXXXXX)

### Step 2: Add to HTML Head

```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Step 3: Custom Event Tracking

```javascript
// Track protobuf validation events
function trackProtobufValidation(fileSize, errorCount, validationType) {
  gtag('event', 'validate_protobuf', {
    'event_category': 'validation',
    'file_size_kb': Math.round(fileSize / 1024),
    'error_count': errorCount,
    'validation_type': validationType, // 'upload' or 'paste'
    'value': 1
  });
}

// Track file input method
function trackFileInput(method) {
  gtag('event', 'file_input', {
    'event_category': 'engagement',
    'input_method': method, // 'upload', 'paste', 'example'
    'value': 1
  });
}

// Track error types found
function trackErrorTypes(syntaxErrors, styleErrors, importErrors) {
  gtag('event', 'validation_results', {
    'event_category': 'results',
    'syntax_errors': syntaxErrors,
    'style_violations': styleErrors,
    'import_errors': importErrors,
    'value': 1
  });
}

// Track feature usage
function trackFeatureUsage(feature) {
  gtag('event', 'feature_usage', {
    'event_category': 'features',
    'feature_name': feature, // 'style_check', 'performance_hints', etc.
    'value': 1
  });
}
```

### Step 4: Implementation Example

```javascript
// Example: When user clicks validate button
document.getElementById('validate-btn').addEventListener('click', function() {
  const fileContent = getFileContent();
  const inputMethod = getInputMethod(); // 'upload' or 'paste'
  
  // Track validation attempt
  trackFileInput(inputMethod);
  
  // Perform validation
  validateProtobuf(fileContent).then(results => {
    trackProtobufValidation(
      fileContent.length,
      results.totalErrors,
      inputMethod
    );
    
    trackErrorTypes(
      results.syntaxErrors.length,
      results.styleErrors.length,
      results.importErrors.length
    );
  });
});
```

### Step 5: Key Metrics to Monitor

**Engagement Metrics:**
- Page views
- Unique users
- Session duration
- Bounce rate

**Validation Metrics:**
- Total validations performed
- File input method preference (upload vs paste)
- Average file size processed
- Error detection rate

**Error Analysis:**
- Most common syntax errors
- Style violation patterns
- Import dependency issues
- Performance optimization opportunities

### Step 6: Custom Dimensions (Optional)

Set up custom dimensions in GA4 for deeper insights:
- File size ranges (small, medium, large)
- Error severity levels
- User's protobuf version (proto2 vs proto3)
- Validation completion rate

## Privacy Considerations

- No personal data collection
- File content is NOT sent to GA (only metadata)
- Consider adding privacy policy link
- GDPR compliant by default (no PII collected)

## Implementation Checklist

- [ ] Create GA4 property
- [ ] Add tracking code to HTML head
- [ ] Implement custom events
- [ ] Test event firing in GA4 debug mode
- [ ] Set up conversion goals (successful validations)
- [ ] Create custom dashboard for key metrics