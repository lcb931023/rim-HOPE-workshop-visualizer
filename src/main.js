// Main Application Initialization
// This file initializes the application and creates global instances

// Global instances
let appState;
let streamgraphView;
let wordAnalysisView;
let languageAnalyzer;
let controlsManager;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize app state
    appState = new AppState();
    appState.setTimeRange(180); // 6 months default
    
    // Initialize view components
    streamgraphView = new StreamgraphView('chartContainer');
    wordAnalysisView = new WordAnalysisView('wordCloudContainer', 'wordList', 'wordCloud');
    languageAnalyzer = new LanguageAnalyzer(appState);
    
    // Initialize controls manager
    controlsManager = new ControlsManager(appState, streamgraphView, wordAnalysisView);
    
    // Initialize responsive controls
    controlsManager.handleResponsiveControls();
    
    // Make instances globally available for HTML event handlers
    window.controlsManager = controlsManager;
    window.wordAnalysisView = wordAnalysisView;
    window.appState = appState;
    
    console.log('Signal Messages Streamgraph loaded with modular architecture. Please select your message files to begin.');
});