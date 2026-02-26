// Analytics for protolint.com
// GA4 Measurement ID: G-R81K03VNLG

class ProtolintAnalytics {
  constructor(measurementId) {
    this.measurementId = measurementId;
    this.initGoogleAnalytics();
  }

  initGoogleAnalytics() {
    // Load GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', this.measurementId);
    
    // Make gtag globally available
    window.gtag = gtag;
  }

  // Track when user uploads or pastes a file
  trackFileInput(method, fileSize = null) {
    gtag('event', 'file_input', {
      'event_category': 'engagement',
      'input_method': method, // 'upload', 'paste', 'example'
      'file_size_kb': fileSize ? Math.round(fileSize / 1024) : null,
      'value': 1
    });
  }

  // Track validation attempts
  trackValidation(fileSize, inputMethod) {
    gtag('event', 'validation_attempt', {
      'event_category': 'validation',
      'file_size_kb': Math.round(fileSize / 1024),
      'input_method': inputMethod,
      'value': 1
    });
  }

  // Track validation results
  trackValidationResults(results) {
    gtag('event', 'validation_complete', {
      'event_category': 'results',
      'total_errors': results.totalErrors || 0,
      'syntax_errors': results.syntaxErrors?.length || 0,
      'style_violations': results.styleErrors?.length || 0,
      'import_errors': results.importErrors?.length || 0,
      'performance_hints': results.performanceHints?.length || 0,
      'validation_success': results.totalErrors === 0 ? 'true' : 'false',
      'value': 1
    });
  }

  // Track specific error types for pattern analysis
  trackErrorPattern(errorType, errorMessage) {
    gtag('event', 'error_pattern', {
      'event_category': 'errors',
      'error_type': errorType, // 'syntax', 'style', 'import', 'performance'
      'error_category': this.categorizeError(errorMessage),
      'value': 1
    });
  }

  // Track feature usage
  trackFeature(featureName, action = 'used') {
    gtag('event', 'feature_usage', {
      'event_category': 'features',
      'feature_name': featureName,
      'action': action,
      'value': 1
    });
  }

  // Track download of results
  trackDownload(format) {
    gtag('event', 'download_results', {
      'event_category': 'engagement',
      'download_format': format, // 'json', 'txt', 'pdf'
      'value': 1
    });
  }

  // Track help/documentation usage
  trackHelp(section) {
    gtag('event', 'help_viewed', {
      'event_category': 'documentation',
      'help_section': section,
      'value': 1
    });
  }

  // Categorize errors for better insights
  categorizeError(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('syntax') || message.includes('parse')) return 'syntax';
    if (message.includes('import') || message.includes('dependency')) return 'import';
    if (message.includes('field') && message.includes('number')) return 'field_numbering';
    if (message.includes('reserved')) return 'reserved_fields';
    if (message.includes('style') || message.includes('naming')) return 'naming_style';
    if (message.includes('performance')) return 'performance';
    
    return 'other';
  }

  // Track user journey milestones
  trackMilestone(milestone) {
    gtag('event', 'user_milestone', {
      'event_category': 'journey',
      'milestone': milestone, // 'first_visit', 'first_validation', 'return_user'
      'value': 1
    });
  }
}

// Usage example:
// const analytics = new ProtolintAnalytics('G-R81K03VNLG');
// 
// // When user uploads file
// analytics.trackFileInput('upload', file.size);
// 
// // When validation starts
// analytics.trackValidation(fileContent.length, 'upload');
// 
// // When validation completes
// analytics.trackValidationResults({
//   totalErrors: 5,
//   syntaxErrors: [error1, error2],
//   styleErrors: [error3],
//   importErrors: [],
//   performanceHints: [hint1, hint2]
// });

export default ProtolintAnalytics;