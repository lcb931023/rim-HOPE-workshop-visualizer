// Word Analysis and Visualization Component

class WordAnalysisView {
    constructor(containerId, listId, cloudId) {
        this.containerId = containerId;
        this.listId = listId;
        this.cloudId = cloudId;
        this.tooltip = null;
        
        // Bind methods that will be called from HTML event handlers
        this.switchView = this.switchView.bind(this);
        
        this.initializeTooltip();
    }
    
    initializeTooltip() {
        this.tooltip = d3.select(".word-tooltip");
        if (this.tooltip.empty()) {
            this.tooltip = d3.select("body").append("div")
                .attr("class", "word-tooltip");
        }
    }
    
    switchView(viewType, wordData, onWordHover, onWordLeave) {
        document.getElementById('cloudViewBtn').classList.toggle('btn-active', viewType === 'cloud');
        document.getElementById('listViewBtn').classList.toggle('btn-active', viewType === 'list');
        
        document.getElementById(this.cloudId).style.display = viewType === 'cloud' ? 'block' : 'none';
        document.getElementById(this.listId).style.display = viewType === 'list' ? 'block' : 'none';
        
        if (viewType === 'list') {
            this.renderList(wordData, onWordHover, onWordLeave);
        } else {
            this.renderCloud(wordData, onWordHover, onWordLeave);
        }
    }
    
    renderList(wordData, onWordHover = null, onWordLeave = null) {
        if (!wordData || wordData.length === 0) {
            document.getElementById(this.listId).innerHTML = '<div style="text-align: center; color: #666; margin-top: 50px;">No words to display</div>';
            return;
        }
        
        const wordListContainer = document.getElementById(this.listId);
        wordListContainer.innerHTML = '';
        
        const timestamps = wordData.map(d => d.firstAppearance).filter(t => t);
        const minTimestamp = Math.min(...timestamps.map(t => t.getTime()));
        const maxTimestamp = Math.max(...timestamps.map(t => t.getTime()));
        
        const colorScale = (timestamp) => {
            if (!timestamp) return '#90EE90';
            
            const normalizedTime = (timestamp.getTime() - minTimestamp) / (maxTimestamp - minTimestamp || 1);
            const saturation = 30 + (normalizedTime * 70);
            const lightness = 60 - (normalizedTime * 20);
            return `hsl(120, ${saturation}%, ${lightness}%)`;
        };
        
        const maxCount = Math.max(...wordData.map(d => d.count));
        
        wordData.forEach((word, index) => {
            const listItem = document.createElement('div');
            listItem.className = 'word-list-item';
            
            const barWidth = (word.count / maxCount) * 100;
            const barColor = colorScale(word.firstAppearance);
            
            listItem.innerHTML = `
                <div class="word-list-rank">${index + 1}</div>
                <div class="word-list-text">${word.text}</div>
                <div class="word-list-bar-container">
                    <div class="word-list-bar" style="width: ${barWidth}%; background-color: ${barColor};"></div>
                </div>
                <div class="word-list-count">${word.count}</div>
            `;
            
            if (onWordHover) {
                listItem.addEventListener('mouseenter', (event) => onWordHover(event, word));
                listItem.addEventListener('mousemove', (event) => onWordHover(event, word, true));
            }
            
            if (onWordLeave) {
                listItem.addEventListener('mouseleave', (event) => onWordLeave(event, word));
            }
            
            wordListContainer.appendChild(listItem);
        });
    }
    
    renderCloud(wordCloudData, onWordHover = null, onWordLeave = null) {
        if (!wordCloudData || wordCloudData.length === 0) {
            const wordCloudContainer = document.getElementById(this.cloudId);
            wordCloudContainer.innerHTML = '<text x="50%" y="50%" text-anchor="middle" font-size="16" fill="#666">No words found with current filters</text>';
            return;
        }
        
        d3.select(`#${this.cloudId}`).selectAll("*").remove();
        
        const cloudContainer = document.getElementById(this.containerId);
        cloudContainer.offsetHeight;
        
        const containerRect = cloudContainer.getBoundingClientRect();
        const containerStyles = window.getComputedStyle(cloudContainer);
        
        const borderWidth = parseFloat(containerStyles.borderLeftWidth) + parseFloat(containerStyles.borderRightWidth);
        const borderHeight = parseFloat(containerStyles.borderTopWidth) + parseFloat(containerStyles.borderBottomWidth);
        
        const containerWidth = Math.max(containerRect.width - borderWidth, 200);
        const containerHeight = Math.max(containerRect.height - borderHeight, 200);
        
        const wordCloudSvg = d3.select(`#${this.cloudId}`)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        
        const wordCloudGroup = wordCloudSvg.append("g")
            .attr("transform", `translate(${containerWidth/2},${containerHeight/2})`);
        
        const colorScale = d3.scaleOrdinal()
            .domain(wordCloudData.map(d => d.text))
            .range(['#2d5016', '#3e6b1f', '#4f8528', '#609f31', '#71b83a', '#82d243', '#5a9c2d', '#4a8125', '#3a661d', '#6db33b', '#7cc844', '#8bdc4c', '#4d7926', '#5e943f', '#6faf48', '#80ca51']);
        
        const layout = d3.layout.cloud()
            .size([containerWidth, containerHeight])
            .words(wordCloudData)
            .padding(5)
            .rotate(() => ~~(Math.random() * 2) * 90)
            .font("system-ui")
            .fontSize(d => d.size)
            .on("end", (words) => {
                const text = wordCloudGroup.selectAll("text")
                    .data(words)
                    .enter().append("text")
                    .style("font-size", d => d.size + "px")
                    .style("font-family", "system-ui")
                    .style("fill", d => colorScale(d.text))
                    .attr("text-anchor", "middle")
                    .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
                    .text(d => d.text)
                    .style("cursor", "pointer");
                    
                if (onWordHover) {
                    text.on("mouseover", (event, d) => {
                        d3.select(event.currentTarget).style("opacity", 0.7);
                        onWordHover(event, d);
                    })
                    .on("mousemove", (event, d) => onWordHover(event, d, true));
                }
                
                if (onWordLeave) {
                    text.on("mouseout", (event, d) => {
                        d3.select(event.currentTarget).style("opacity", 1);
                        onWordLeave(event, d);
                    });
                }
            });
        
        layout.start();
    }
    
    showTooltip(event, word, isMove = false) {
        let timeRangeText = '';
        if (word.firstAppearance && word.lastAppearance) {
            const firstDate = word.firstAppearance.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            const lastDate = word.lastAppearance.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            if (firstDate === lastDate) {
                timeRangeText = `Used on: ${firstDate}`;
            } else {
                timeRangeText = `Used from: ${firstDate} to ${lastDate}`;
            }
        } else {
            timeRangeText = 'Time range: Unknown';
        }
            
        this.tooltip
            .style("opacity", 1)
            .html(`
                <div class="word-tooltip-word">${word.text}</div>
                <div class="word-tooltip-count">Appears ${word.count} times</div>
                <div class="word-tooltip-first">${timeRangeText}</div>
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    }
    
    hideTooltip() {
        this.tooltip.style("opacity", 0);
    }
    
    generateCloudFromTimeInterval(intervalStart, intervalDays, contactName = null) {
        const intervalEnd = new Date(intervalStart.getTime() + intervalDays * 24 * 60 * 60 * 1000);
        
        const timeMessages = appState.allMessages.filter(m => {
            return m.sent >= intervalStart && m.sent < intervalEnd &&
                   (contactName === null || m.contact === contactName);
        });
        
        if (timeMessages.length === 0) {
            console.log('No messages in time interval');
            return;
        }
        
        const contactFilter = contactName || 'all';
        const messageSource = 'all';
        const minWordLength = parseInt(document.getElementById('minWordLength')?.value || 3);
        const maxWords = parseInt(document.getElementById('maxWords')?.value || 100);
        
        const result = DataProcessor.generateWordFrequencies(timeMessages, contactFilter, messageSource, minWordLength);
        const { wordFrequencies, wordFirstAppearance, wordLastAppearance, processedMessages } = result;
        
        const timeWordCloudData = DataProcessor.generateWordCloudData(wordFrequencies, wordFirstAppearance, wordLastAppearance, maxWords);
        
        this.renderCloudFromData(timeWordCloudData);
        
        this.updateFilterDisplayForTime(intervalStart, intervalDays, contactName, processedMessages);
    }
    
    generateListFromTimeInterval(intervalStart, intervalDays, contactName = null) {
        const intervalEnd = new Date(intervalStart.getTime() + intervalDays * 24 * 60 * 60 * 1000);
        
        const timeMessages = appState.allMessages.filter(m => {
            return m.sent >= intervalStart && m.sent < intervalEnd &&
                   (contactName === null || m.contact === contactName);
        });
        
        if (timeMessages.length === 0) {
            console.log('No messages in time interval');
            return;
        }
        
        const contactFilter = contactName || 'all';
        const messageSource = 'all';
        const minWordLength = parseInt(document.getElementById('minWordLength')?.value || 3);
        const maxWords = parseInt(document.getElementById('maxWords')?.value || 100);
        
        const result = DataProcessor.generateWordFrequencies(timeMessages, contactFilter, messageSource, minWordLength);
        const { wordFrequencies, wordFirstAppearance, wordLastAppearance, processedMessages } = result;
        
        const timeWordArray = Array.from(wordFrequencies.entries())
            .map(([word, count]) => ({ 
                text: word, 
                count: count,
                firstAppearance: wordFirstAppearance.get(word),
                lastAppearance: wordLastAppearance.get(word)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, maxWords);
        
        this.renderList(timeWordArray, () => {}, () => {});
        
        this.updateFilterDisplayForTime(intervalStart, intervalDays, contactName, processedMessages);
    }
    
    updateFilterDisplayForTime(intervalStart, intervalDays, contactName, messageCount) {
        const filterDisplay = document.getElementById('wordCloudFilterDisplay');
        
        const startDate = intervalStart.toLocaleDateString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric' 
        });
        
        const endDate = new Date(intervalStart.getTime() + intervalDays * 24 * 60 * 60 * 1000)
            .toLocaleDateString('en-US', { 
                year: 'numeric', month: 'short', day: 'numeric' 
            });
        
        let filterText = `Time: ${startDate}`;
        if (intervalDays > 1) {
            filterText += ` to ${endDate}`;
        }
        
        if (contactName) {
            filterText += ` • Contact: ${contactName}`;
        }
        
        filterText += ` • ${messageCount} messages`;
        
        filterDisplay.textContent = `Filtering: ${filterText}`;
    }
    
    renderCloudFromData(wordCloudData) {
        if (!wordCloudData || wordCloudData.length === 0) {
            const wordCloudContainer = document.getElementById('wordCloud');
            wordCloudContainer.innerHTML = '<text x="50%" y="50%" text-anchor="middle" font-size="16" fill="#666">No words found</text>';
            return;
        }
        
        const loadingIndicator = document.getElementById('wordCloudLoading');
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        
        d3.select("#wordCloud").selectAll("*").remove();
        
        const cloudContainer = document.getElementById('wordCloudContainer');
        const containerRect = cloudContainer.getBoundingClientRect();
        const containerStyles = window.getComputedStyle(cloudContainer);
        
        const borderWidth = parseFloat(containerStyles.borderLeftWidth) + parseFloat(containerStyles.borderRightWidth);
        const borderHeight = parseFloat(containerStyles.borderTopWidth) + parseFloat(containerStyles.borderBottomWidth);
        
        const containerWidth = Math.max(containerRect.width - borderWidth, 200);
        const containerHeight = Math.max(containerRect.height - borderHeight, 200);
        
        const wordCloudSvg = d3.select("#wordCloud")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        
        const wordCloudGroup = wordCloudSvg.append("g")
            .attr("transform", `translate(${containerWidth/2},${containerHeight/2})`);
        
        let wordTooltip = d3.select(".word-tooltip");
        if (wordTooltip.empty()) {
            wordTooltip = d3.select("body").append("div")
                .attr("class", "word-tooltip");
        }
        
        const colorScale = d3.scaleOrdinal()
            .domain(wordCloudData.map(d => d.text))
            .range(['#2d5016', '#3e6b1f', '#4f8528', '#609f31', '#71b83a', '#82d243']);
        
        const layout = d3.layout.cloud()
            .size([containerWidth, containerHeight])
            .words(wordCloudData)
            .padding(5)
            .rotate(() => ~~(Math.random() * 2) * 90)
            .font("system-ui")
            .fontSize(d => d.size)
            .on("end", draw);
        
        layout.start();
        
        function draw(words) {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            wordCloudGroup.selectAll("text")
                .data(words)
                .enter().append("text")
                .style("font-size", d => d.size + "px")
                .style("font-family", "system-ui")
                .style("fill", d => colorScale(d.text))
                .attr("text-anchor", "middle")
                .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
                .text(d => d.text)
                .style("cursor", "pointer")
                .on("mouseover", function(event, d) {
                    d3.select(this).style("opacity", 0.7);
                    
                    let timeRangeText = 'Time range: Unknown';
                    if (d.firstAppearance && d.lastAppearance) {
                        const firstDate = d.firstAppearance.toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        });
                        const lastDate = d.lastAppearance.toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        });
                        
                        if (firstDate === lastDate) {
                            timeRangeText = `Used on: ${firstDate}`;
                        } else {
                            timeRangeText = `Used from: ${firstDate} to ${lastDate}`;
                        }
                    }
                    
                    wordTooltip
                        .style("opacity", 1)
                        .html(`
                            <div class="word-tooltip-word">${d.text}</div>
                            <div class="word-tooltip-count">Appears ${d.count} times</div>
                            <div class="word-tooltip-first">${timeRangeText}</div>
                        `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                        
                    streamgraphView.highlightTimeRange(d.firstAppearance, d.lastAppearance);
                })
                .on("mousemove", function(event, d) {
                    wordTooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mouseout", function(event, d) {
                    d3.select(this).style("opacity", 1);
                    wordTooltip.style("opacity", 0);
                    streamgraphView.hideTimeRange();
                });
        }
    }
}

// Export for use in other modules
window.WordAnalysisView = WordAnalysisView;