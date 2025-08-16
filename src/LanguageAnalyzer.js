// Language Analysis Component

class LanguageAnalyzer {
    constructor(appState) {
        this.appState = appState;
        this.languageNames = {
            'eng': 'English',
            'cmn': 'Chinese',
            'spa': 'Spanish',
            'fra': 'French',
            'deu': 'German',
            'rus': 'Russian',
            'jpn': 'Japanese',
            'kor': 'Korean',
            'ara': 'Arabic',
            'hin': 'Hindi',
            'por': 'Portuguese',
            'ita': 'Italian',
            'nld': 'Dutch',
            'swe': 'Swedish',
            'dan': 'Danish',
            'nor': 'Norwegian',
            'fin': 'Finnish',
            'tur': 'Turkish',
            'pol': 'Polish',
            'ces': 'Czech',
            'hun': 'Hungarian',
            'ron': 'Romanian',
            'bul': 'Bulgarian',
            'hrv': 'Croatian',
            'slk': 'Slovak',
            'slv': 'Slovenian',
            'est': 'Estonian',
            'lav': 'Latvian',
            'lit': 'Lithuanian',
            'ell': 'Greek',
            'heb': 'Hebrew',
            'tha': 'Thai',
            'vie': 'Vietnamese',
            'ind': 'Indonesian',
            'msa': 'Malay',
            'tgl': 'Tagalog',
            'ukr': 'Ukrainian'
        };
        this.margin = { top: 40, right: 40, bottom: 80, left: 80 };
        this.languageG = null;
        this.tooltip = d3.select("#tooltip");
        this.timeHighlight = d3.select("#timeHighlight");
    }
    
    detectLanguage(text) {
        if (!text || text.trim().length === 0) {
            return 'Unknown';
        }
        
        try {
            if (typeof franc !== 'undefined') {
                const detected = franc(text);
                return this.languageNames[detected] || 'Unknown';
            }
        } catch (error) {
            console.log('Language detection error:', error);
        }
        
        // Fallback detection based on character patterns
        if (/[\u4e00-\u9fff]/.test(text)) {
            return 'Chinese';
        }
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
            return 'Japanese';
        }
        if (/[\uac00-\ud7af]/.test(text)) {
            return 'Korean';
        }
        if (/[\u0600-\u06ff]/.test(text)) {
            return 'Arabic';
        }
        if (/[\u0400-\u04ff]/.test(text)) {
            return 'Russian';
        }
        if (/[àâäéèêëïîôöùûüÿç]/.test(text)) {
            return 'French';
        }
        if (/[äöüß]/.test(text)) {
            return 'German';
        }
        if (/[ñáéíóúü]/.test(text)) {
            return 'Spanish';
        }
        if (/[àáâãçéêíóôõú]/.test(text)) {
            return 'Portuguese';
        }
        
        // Default to English for Latin script
        return 'English';
    }
    
    analyzeDistribution(messages) {
        const languages = {};
        messages.forEach(message => {
            if (message.text && message.text.trim()) {
                const language = this.detectLanguage(message.text);
                languages[language] = (languages[language] || 0) + 1;
            }
        });
        
        return languages;
    }
    
    processData(intervalDays, rangeDays) {
        if (!this.appState.allMessages || this.appState.allMessages.length === 0) {
            return [];
        }
        
        let filteredMessages = this.appState.allMessages;
        
        // Apply contact filtering if a specific contact is highlighted
        if (this.appState.highlightedContact) {
            filteredMessages = filteredMessages.filter(m => m.contact === this.appState.highlightedContact);
        }
        
        // Apply date filtering similar to main data processing
        if (rangeDays !== -1) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - rangeDays);
            filteredMessages = filteredMessages.filter(m => m.sent >= cutoffDate);
        }
        
        if (filteredMessages.length === 0) return [];
        
        // Group messages by time intervals
        const languageData = [];
        const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
        const startDate = filteredMessages[0].sent;
        
        // Group messages by interval
        const intervalGroups = {};
        
        filteredMessages.forEach(message => {
            const daysSinceStart = Math.floor((message.sent - startDate) / (24 * 60 * 60 * 1000));
            const intervalIndex = Math.floor(daysSinceStart / intervalDays);
            const intervalStart = new Date(startDate.getTime() + intervalIndex * intervalMs);
            const intervalKey = intervalStart.toISOString().split('T')[0];
            
            if (!intervalGroups[intervalKey]) {
                intervalGroups[intervalKey] = {
                    date: intervalStart,
                    messages: []
                };
            }
            
            intervalGroups[intervalKey].messages.push(message);
        });
        
        // Analyze language distribution for each interval
        Object.values(intervalGroups).forEach(interval => {
            const languages = this.analyzeDistribution(interval.messages);
            
            languageData.push({
                date: interval.date,
                languages: languages
            });
        });
        
        return languageData.sort((a, b) => a.date - b.date);
    }
    
    createAnalysis() {
        const loadingIndicator = document.getElementById('languageLoadingIndicator');
        loadingIndicator.style.display = 'block';
        
        const intervalDays = parseInt(document.getElementById('timeInterval')?.value || 7);
        const rangeDays = this.appState.currentRangeDays || 180;
        
        const languageData = this.processData(intervalDays, rangeDays);
        
        this.initializeChart();
        
        this.createStreamgraph(languageData, intervalDays);
        
        loadingIndicator.style.display = 'none';
    }
    
    initializeChart() {
        const chartContainer = document.getElementById('languageChartContainer');
        const containerWidth = chartContainer.clientWidth;
        const containerHeight = chartContainer.clientHeight;
        
        const width = containerWidth - this.margin.left - this.margin.right - 4;
        const height = containerHeight - this.margin.top - this.margin.bottom - 4;
        
        // Clear any existing SVG
        d3.select("#languageChart").selectAll("*").remove();
        
        // Create SVG with responsive dimensions
        const languageSvg = d3.select("#languageChart")
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);
        
        this.languageG = languageSvg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
    }
    
    createStreamgraph(data, intervalDays = 7) {
        if (!data || data.length === 0) {
            console.log('No language data to display');
            return;
        }
        
        // Show the language legend
        const languageLegend = document.getElementById('languageLegend');
        if (languageLegend) {
            languageLegend.classList.remove('hide');
        }
        
        // Get all unique languages
        const allLanguages = new Set();
        data.forEach(d => {
            Object.keys(d.languages).forEach(lang => allLanguages.add(lang));
        });
        const languageNames = Array.from(allLanguages);
        
        // Prepare data for D3 stack
        const stackData = data.map(d => {
            const item = { date: d.date };
            languageNames.forEach(lang => {
                item[lang] = d.languages[lang] || 0;
            });
            return item;
        });
        
        const chartContainer = document.getElementById('languageChartContainer');
        const containerWidth = chartContainer.clientWidth;
        const containerHeight = chartContainer.clientHeight;
        const width = containerWidth - this.margin.left - this.margin.right - 4;
        const height = containerHeight - this.margin.top - this.margin.bottom - 4;
        
        // Create scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, width]);
        
        const stack = d3.stack()
            .keys(languageNames)
            .offset(d3.stackOffsetWiggle);
        
        const stackedData = stack(stackData);
        
        const yExtent = d3.extent(stackedData.flat(2));
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([height, 0]);
        
        // Color scale for languages
        const colorScale = d3.scaleOrdinal()
            .domain(languageNames)
            .range(d3.schemeCategory10);
        
        // Create area generator
        const area = d3.area()
            .x(d => xScale(d.data.date))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]))
            .curve(d3.curveBasis);
        
        // Draw streams
        const streams = this.languageG.selectAll(".language-stream")
            .data(stackedData)
            .enter()
            .append("path")
            .attr("class", "language-stream")
            .attr("fill", d => colorScale(d.key))
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.7)
            .attr("d", area);
        
        // Add hover overlay for language streamgraph
        const hoverOverlay = this.languageG.append("rect")
            .attr("class", "language-hover-overlay")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "transparent")
            .style("cursor", "crosshair");
        
        // Add hover interactions
        hoverOverlay.on("mousemove", (event) => {
            this.handleLanguageHover(event, data, stackedData, streams, languageNames, intervalDays, xScale, yScale, width, height);
        });
        
        hoverOverlay.on("mouseleave", (event) => {
            this.handleLanguageLeave(streams);
        });
        
        // Add axes
        this.languageG.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));
        
        this.languageG.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale));
        
        // Update language legend
        this.updateLegend(languageNames, colorScale);
        
        console.log('Language streamgraph creation completed');
    }
    
    updateLegend(languages, colorScale) {
        const legend = d3.select("#languageLegend");
        
        const items = legend.selectAll(".legend-item")
            .data(languages, d => d);
        
        items.exit().remove();
        
        const newItems = items.enter()
            .append("div")
            .attr("class", "legend-item");
        
        newItems.append("div")
            .attr("class", "legend-color");
        
        newItems.append("span");
        
        const allItems = newItems.merge(items);
        
        allItems.select(".legend-color")
            .style("background-color", language => colorScale(language));
        
        allItems.select("span")
            .text(d => d);
    }
    
    handleLanguageHover(event, data, stackedData, streams, languageNames, intervalDays, xScale, yScale, width, height) {
        const [mouseX, mouseY] = d3.pointer(event, event.target);
        
        // Find closest data point
        const mouseDate = xScale.invert(mouseX);
        const closest = data.reduce((prev, curr) => 
            Math.abs(curr.date - mouseDate) < Math.abs(prev.date - mouseDate) ? curr : prev
        );
        
        // Calculate time interval highlight
        const intervalWidth = this.calculateIntervalWidth(closest.date, intervalDays, xScale);
        const intervalStartX = xScale(closest.date);
        
        // Show time interval highlight
        this.timeHighlight.style('display', 'block')
            .style('left', (intervalStartX + this.margin.left) + 'px')
            .style('width', intervalWidth + 'px')
            .style('top', this.margin.top + 'px')
            .style('height', height + 'px');
        
        // Find which language the mouse is over
        const stackPoint = stackedData.map(languageStack => {
            const dataPoint = languageStack.find(d => d.data === closest);
            if (!dataPoint) return null;
            
            const y0 = yScale(dataPoint[0]);
            const y1 = yScale(dataPoint[1]);
            
            return {
                language: languageStack.key,
                y0: y0,
                y1: y1,
                inRange: mouseY >= y1 && mouseY <= y0,
                count: closest.languages[languageStack.key] || 0
            };
        }).filter(d => d !== null);
        
        // Find the hovered language (or default to first)
        const hoveredLanguage = stackPoint.find(d => d.inRange);
        const languageName = hoveredLanguage ? hoveredLanguage.language : stackPoint[0]?.language || languageNames[0];
        const languageCount = closest.languages[languageName] || 0;
        
        // Calculate total messages in this time period
        const totalMessages = Object.values(closest.languages).reduce((sum, count) => sum + count, 0);
        const percentage = totalMessages > 0 ? ((languageCount / totalMessages) * 100).toFixed(1) : 0;
        
        // Format date based on interval
        let dateDisplay;
        if (intervalDays === 1) {
            dateDisplay = closest.date.toLocaleDateString();
        } else if (intervalDays === 7) {
            const endDate = new Date(closest.date.getTime() + 6 * 24 * 60 * 60 * 1000);
            dateDisplay = `${closest.date.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        } else {
            const endDate = new Date(closest.date.getTime() + (intervalDays - 1) * 24 * 60 * 60 * 1000);
            dateDisplay = `${closest.date.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        }
        
        // Update tooltip
        this.tooltip
            .style("opacity", 1)
            .html(`
                <div class="tooltip-header">
                    <div class="tooltip-contact">${languageName}</div>
                    <div class="tooltip-date">${intervalDays} day${intervalDays > 1 ? 's' : ''}</div>
                </div>
                <div class="tooltip-stats">
                    <div class="stat-row">
                        <span class="stat-label">Period:</span>
                        <span class="stat-value">${dateDisplay}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Messages:</span>
                        <span class="stat-value highlight">${languageCount}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Percentage:</span>
                        <span class="stat-value">${percentage}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Total in Period:</span>
                        <span class="stat-value">${totalMessages}</span>
                    </div>
                </div>
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 10) + "px");
        
        // Highlight the hovered stream
        streams.attr("opacity", d => d.key === languageName ? 0.9 : 0.4);
    }
    
    handleLanguageLeave(streams) {
        this.timeHighlight.style('display', 'none');
        this.tooltip.style("opacity", 0);
        
        // Restore normal opacity
        streams.attr("opacity", 0.7);
    }
    
    calculateIntervalWidth(date, intervalDays, xScale) {
        const intervalStart = new Date(date);
        const intervalEnd = new Date(intervalStart.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
        const startX = xScale(intervalStart);
        const endX = xScale(intervalEnd);
        return Math.max(endX - startX, 8);
    }
}

// Export for use in other modules
window.LanguageAnalyzer = LanguageAnalyzer;