// Global instances
const appState = new AppState();
const streamgraphView = new StreamgraphView('chartContainer');
const wordAnalysisView = new WordAnalysisView('wordCloudContainer', 'wordList', 'wordCloud');
const languageAnalyzer = new LanguageAnalyzer(appState);
let controlsManager;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize date range system with default
    appState.setTimeRange(180); // 6 months default
    
    // Initialize controls manager
    controlsManager = new ControlsManager(appState, streamgraphView, wordAnalysisView);
    
    // Initialize responsive controls
    controlsManager.handleResponsiveControls();
    
    // Make instances globally available for HTML event handlers
    window.controlsManager = controlsManager;
    window.wordAnalysisView = wordAnalysisView;
    window.appState = appState;
    
    console.log('Signal Messages Streamgraph loaded with new architecture. Please select your message files to begin.');
});