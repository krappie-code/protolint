"use client";

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export default function AnalyticsTest() {
  const [gtagLoaded, setGtagLoaded] = useState(false);
  const [testEvents, setTestEvents] = useState<string[]>([]);

  useEffect(() => {
    // Check if gtag is loaded
    const checkGtag = () => {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        setGtagLoaded(true);
        console.log('✅ Google Analytics gtag loaded successfully');
        console.log('📊 DataLayer:', window.dataLayer?.slice(-5)); // Show last 5 events
      } else {
        console.log('❌ Google Analytics gtag not loaded yet');
      }
    };

    // Check immediately and every second for 10 seconds
    checkGtag();
    const interval = setInterval(checkGtag, 1000);
    setTimeout(() => clearInterval(interval), 10000);

    return () => clearInterval(interval);
  }, []);

  const fireTestEvent = () => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      const eventName = `test_event_${Date.now()}`;
      window.gtag('event', eventName, {
        event_category: 'debug',
        test_parameter: 'test_value',
        timestamp: new Date().toISOString(),
        value: 1
      });
      
      const message = `🎯 Fired: ${eventName}`;
      setTestEvents(prev => [message, ...prev.slice(0, 4)]);
      console.log(message);
    } else {
      const message = '❌ gtag not available';
      setTestEvents(prev => [message, ...prev.slice(0, 4)]);
      console.log(message);
    }
  };

  // Only show in development or when ?debug=analytics is in URL
  const showDebug = process.env.NODE_ENV === 'development' || 
    (typeof window !== 'undefined' && window.location.search.includes('debug=analytics'));

  if (!showDebug) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm text-xs">
      <div className="font-bold mb-2">🔧 Analytics Debug</div>
      <div className="mb-2">
        GA4 Status: {gtagLoaded ? '✅ Loaded' : '⏳ Loading...'}
      </div>
      <div className="mb-2">
        Measurement ID: G-R81K03VNLG
      </div>
      <button
        onClick={fireTestEvent}
        className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs mb-2"
      >
        🎯 Fire Test Event
      </button>
      {testEvents.length > 0 && (
        <div className="border-t border-gray-700 pt-2">
          <div className="font-semibold">Recent Events:</div>
          {testEvents.map((event, i) => (
            <div key={i} className="text-xs opacity-75">{event}</div>
          ))}
        </div>
      )}
    </div>
  );
}