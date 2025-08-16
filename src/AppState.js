// Application State Management
class AppState {
    constructor() {
        this.rawData = [];
        this.processedData = [];
        this.loadedFiles = [];
        this.allMessages = [];
        this.wordFrequencies = new Map();
        this.wordFirstAppearance = new Map();
        this.wordLastAppearance = new Map();
        this.wordCloudData = [];
        this.highlightedContact = null;
        this.currentHoverData = null;
        this.currentHoveredInterval = null;
        this.currentRangeDays = 180;
        this.customStartDate = null;
        this.customEndDate = null;
        this.observers = [];
    }
    
    // Observer pattern for state changes
    subscribe(observer) {
        this.observers.push(observer);
    }
    
    notify(changeType, data) {
        this.observers.forEach(observer => observer(changeType, data));
    }
    
    // State update methods
    setRawData(data) {
        this.rawData = data;
        this.notify('rawDataChanged', data);
    }
    
    setProcessedData(data) {
        this.processedData = data;
        this.notify('processedDataChanged', data);
    }
    
    setAllMessages(messages) {
        this.allMessages = messages;
        this.notify('messagesChanged', messages);
    }
    
    setHighlightedContact(contact) {
        this.highlightedContact = contact;
        this.notify('contactHighlightChanged', contact);
    }
    
    setTimeRange(rangeDays, customStart = null, customEnd = null) {
        this.currentRangeDays = rangeDays;
        this.customStartDate = customStart;
        this.customEndDate = customEnd;
        this.notify('timeRangeChanged', { rangeDays, customStart, customEnd });
    }
    
    setWordData(frequencies, firstAppearance, lastAppearance, cloudData) {
        this.wordFrequencies = frequencies;
        this.wordFirstAppearance = firstAppearance;
        this.wordLastAppearance = lastAppearance;
        this.wordCloudData = cloudData;
        this.notify('wordDataChanged', { frequencies, firstAppearance, lastAppearance, cloudData });
    }
}

// Export for use in other modules
window.AppState = AppState;