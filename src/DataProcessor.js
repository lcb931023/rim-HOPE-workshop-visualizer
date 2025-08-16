// Data Processing Module
class DataProcessor {
    static colorPalette = [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
        '#2c3e50', '#8e44ad', '#27ae60', '#d35400', '#c0392b', '#16a085', '#2980b9', '#8e44ad',
        '#f1c40f', '#e74c3c', '#95a5a6', '#34495e', '#9b59b6', '#3498db', '#1abc9c', '#f39c12'
    ];
    
    static stopWords = new Set([
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 
        'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 
        'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 
        'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 
        'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 
        'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 
        'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 
        'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 
        'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were',
        'said', 'each', 'which', 'their', 'said', 'did', 'get', 'may', 'find', 'use', 'man',
        'here', 'thing', 'give', 'many', 'well', 'ha', 'yeah', 'oh', 'ok', 'okay', 'um', 'uh',
        'haha', 'lol', 'lmao', 'omg', 'wtf', 'tbh', 'imo', 'btw', 'fyi', 'idk', 'nvm',
        'im', 'ill', 'ive', 'dont', 'didnt', 'wont', 'cant', 'couldnt', 'shouldnt', 'wouldnt',
        'thats', 'theres', 'theyre', 'youre', 'youll', 'youve', 'isnt', 'arent', 'wasnt', 'werent',
        "i'm", "i'll", "i've", "don't", "didn't", "won't", "can't", "couldn't", "shouldn't", "wouldn't",
        "that's", "there's", "they're", "you're", "you'll", "you've", "isn't", "aren't", "wasn't", "weren't",
        "it's", "he's", "she's", "we're", "they'll", "they've", "hasn't", "haven't", "hadn't", "doesn't",
        "let's", "here's", "where's", "what's", "who's", "how's", "why's", "when's", "i'd", "you'd",
        "he'd", "she'd", "we'd", "they'd", "would've", "could've", "should've", "might've", "must've"
    ]);
    
    static processData(rawData, intervalDays, rangeDays, customStart = null, customEnd = null) {
        if (rawData.length === 0) return [];
        
        let filteredData = rawData;
        
        // Filter by date range
        if (customStart && customEnd) {
            filteredData = rawData.filter(d => d.date >= customStart && d.date <= customEnd);
        } else if (rangeDays !== -1) {
            // Only apply date filtering if not "All" (-1)
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - rangeDays);
            filteredData = rawData.filter(d => d.date >= cutoffDate);
        }
        // If rangeDays === -1, use all rawData (no filtering)
        
        if (filteredData.length === 0) return [];
        
        // Group by custom intervals
        const aggregated = [];
        const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
        const startDate = filteredData[0].date;
        
        let currentData = null;
        
        filteredData.forEach(d => {
            const daysSinceStart = Math.floor((d.date - startDate) / (24 * 60 * 60 * 1000));
            const intervalIndex = Math.floor(daysSinceStart / intervalDays);
            const intervalStart = new Date(startDate.getTime() + intervalIndex * intervalMs);
            const intervalKey = intervalStart.toISOString().split('T')[0];
            
            if (!currentData || currentData.intervalKey !== intervalKey) {
                if (currentData) {
                    aggregated.push(currentData);
                }
                
                currentData = {
                    date: intervalStart,
                    intervalKey: intervalKey,
                    contacts: {}
                };
                
                Object.keys(d.contacts).forEach(contact => {
                    currentData.contacts[contact] = {
                        sent: 0,
                        received: 0,
                        total: 0,
                        color: d.contacts[contact].color
                    };
                });
            }
            
            Object.keys(d.contacts).forEach(contact => {
                currentData.contacts[contact].sent += d.contacts[contact].sent;
                currentData.contacts[contact].received += d.contacts[contact].received;
                currentData.contacts[contact].total += d.contacts[contact].total;
            });
        });
        
        if (currentData) {
            aggregated.push(currentData);
        }
        
        return aggregated.sort((a, b) => a.date - b.date);
    }
    
    static convertToDataFormat(allMessages) {
        const contacts = [...new Set(allMessages.map(m => m.contact))];
        const messagesByDate = {};
        
        allMessages.forEach(msg => {
            const dateKey = msg.sent.toISOString().split('T')[0];
            if (!messagesByDate[dateKey]) {
                messagesByDate[dateKey] = {};
                contacts.forEach(contact => {
                    messagesByDate[dateKey][contact] = { sent: 0, received: 0, total: 0 };
                });
            }
            
            if (msg.isOutgoing) {
                messagesByDate[dateKey][msg.contact].sent++;
            } else {
                messagesByDate[dateKey][msg.contact].received++;
            }
            messagesByDate[dateKey][msg.contact].total++;
        });
        
        const data = [];
        const sortedDates = Object.keys(messagesByDate).sort();
        
        sortedDates.forEach(dateKey => {
            const dayData = {
                date: new Date(dateKey),
                contacts: {}
            };
            
            contacts.forEach((contact, index) => {
                const stats = messagesByDate[dateKey][contact] || { sent: 0, received: 0, total: 0 };
                dayData.contacts[contact] = {
                    sent: stats.sent,
                    received: stats.received,
                    total: stats.total,
                    color: DataProcessor.colorPalette[index % DataProcessor.colorPalette.length]
                };
            });
            
            data.push(dayData);
        });
        
        return data;
    }
    
    static processTextForWordCloud(text, minWordLength = 3) {
        if (!text) return [];
        
        const words = text.toLowerCase()
            .replace(/[^\w\s'-]/g, ' ')
            .replace(/\s+/g, ' ')
            .split(' ')
            .map(word => word.trim())
            .filter(word => {
                return word.length >= minWordLength &&
                       !DataProcessor.stopWords.has(word) &&
                       !/^\d+$/.test(word) &&
                       !/^https?:\/\//.test(word) &&
                       !/^www\./.test(word);
            });
        
        return words;
    }
    
    static generateWordFrequencies(messages, contactFilter = 'all', messageSource = 'all', minWordLength = 3) {
        const wordFrequencies = new Map();
        const wordFirstAppearance = new Map();
        const wordLastAppearance = new Map();
        let processedMessages = 0;
        let totalWords = 0;
        
        let filteredMessages = messages;
        
        if (contactFilter !== 'all') {
            filteredMessages = filteredMessages.filter(m => m.contact === contactFilter);
        }
        
        if (messageSource === 'sent') {
            filteredMessages = filteredMessages.filter(m => m.isOutgoing);
        } else if (messageSource === 'received') {
            filteredMessages = filteredMessages.filter(m => !m.isOutgoing);
        }
        
        filteredMessages.sort((a, b) => a.sent - b.sent);
        
        filteredMessages.forEach(message => {
            if (!message.text || message.text.trim().length === 0) return;
            
            const words = DataProcessor.processTextForWordCloud(message.text, minWordLength);
            totalWords += words.length;
            processedMessages++;
            
            words.forEach(word => {
                if (word.length >= minWordLength) {
                    wordFrequencies.set(word, (wordFrequencies.get(word) || 0) + 1);
                    
                    if (!wordFirstAppearance.has(word)) {
                        wordFirstAppearance.set(word, message.sent);
                    }
                    
                    wordLastAppearance.set(word, message.sent);
                }
            });
        });
        
        return {
            wordFrequencies,
            wordFirstAppearance,
            wordLastAppearance,
            totalWords,
            uniqueWords: wordFrequencies.size,
            processedMessages
        };
    }
    
    static generateWordCloudData(wordFrequencies, wordFirstAppearance, wordLastAppearance, maxWords = 100) {
        const wordArray = Array.from(wordFrequencies.entries())
            .map(([word, count]) => ({ text: word, size: count }))
            .sort((a, b) => b.size - a.size)
            .slice(0, maxWords);
        
        if (wordArray.length === 0) return [];
        
        const maxCount = wordArray[0].size;
        const minCount = wordArray[wordArray.length - 1].size;
        const minSize = 12;
        const maxSize = 60;
        
        return wordArray.map(word => ({
            text: word.text,
            size: minSize + (word.size - minCount) / (maxCount - minCount || 1) * (maxSize - minSize),
            count: word.size,
            firstAppearance: wordFirstAppearance.get(word.text),
            lastAppearance: wordLastAppearance.get(word.text)
        }));
    }
}

// Export for use in other modules
window.DataProcessor = DataProcessor;