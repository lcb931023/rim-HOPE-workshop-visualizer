// Controls and Event Management Component

class ControlsManager {
    constructor(appState, streamgraphView, wordAnalysisView) {
        this.appState = appState;
        this.streamgraphView = streamgraphView;
        this.wordAnalysisView = wordAnalysisView;
        this.currentHoveredInterval = null;
        
        // Bind methods that will be called from HTML event handlers
        this.toggleControls = this.toggleControls.bind(this);
        this.setDateRange = this.setDateRange.bind(this);
        this.handleCustomDateChange = this.handleCustomDateChange.bind(this);
        this.switchTab = this.switchTab.bind(this);
        this.handleWordHover = this.handleWordHover.bind(this);
        this.handleWordLeave = this.handleWordLeave.bind(this);
        
        this.setupEventListeners();
        this.setupStateObservers();
    }
    
    setupEventListeners() {
        // File handling
        document.getElementById('fileInput')?.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
        });
        
        document.querySelector('.file-input-button')?.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        // Visualization controls
        ['timeInterval'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updateVisualization();
                    this.updateLanguageAnalysis();
                });
                element.addEventListener('change', () => {
                    this.updateVisualization();
                    this.updateLanguageAnalysis();
                });
            }
        });
        
        // Word analysis controls
        ['maxWords', 'minWordLength', 'contactFilter', 'messageSource'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    if (id === 'contactFilter') {
                        this.handleContactHighlighting();
                    }
                    this.updateWordAnalysis();
                });
                element.addEventListener('change', () => {
                    if (id === 'contactFilter') {
                        this.handleContactHighlighting();
                    }
                    this.updateWordAnalysis();
                });
            }
        });
        
        // Window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResponsiveControls();
                
                if (document.getElementById('visualizationsContainer')?.classList.contains('show')) {
                    this.updateVisualization();
                    this.updateWordAnalysis();
                    this.updateLanguageAnalysis();
                }
            }, 250);
        });
    }
    
    setupStateObservers() {
        this.appState.subscribe((changeType, data) => {
            switch (changeType) {
                case 'rawDataChanged':
                    this.populateContactFilter();
                    this.updateCurrentSettings();
                    this.updateVisualization();
                    this.updateWordAnalysis();
                    this.updateLanguageAnalysis();
                    break;
                case 'messagesChanged':
                    this.updateVisualization();
                    this.updateWordAnalysis();
                    this.updateLanguageAnalysis();
                    break;
                case 'contactHighlightChanged':
                    this.updateVisualization();
                    this.updateWordAnalysis();
                    this.updateLanguageAnalysis();
                    break;
                case 'timeRangeChanged':
                    this.updateVisualization();
                    this.updateWordAnalysis();
                    this.updateLanguageAnalysis();
                    break;
            }
        });
    }
    
    async handleFiles(files) {
        const fileStatus = document.getElementById('fileStatus');
        const loadingIndicator = document.getElementById('loadingIndicator');
        
        if (files.length === 0) {
            fileStatus.innerHTML = '<div>No files selected.</div>';
            return;
        }
        
        loadingIndicator.style.display = 'block';
        fileStatus.innerHTML = '<div>📖 Reading files...</div>';
        
        const allMessages = [];
        const fileList = [];
        
        for (const file of files) {
            if (file.name.endsWith('.txt')) {
                try {
                    const content = await file.text();
                    const messages = this.parseSignalFile(content, file.name);
                    allMessages.push(...messages);
                    
                    const contactName = messages.length > 0 ? messages[0].contact : file.name.replace('.txt', '');
                    fileList.push({ name: contactName, messageCount: messages.length });
                } catch (error) {
                    console.error(`Error reading file ${file.name}:`, error);
                }
            }
        }
        
        if (allMessages.length === 0) {
            fileStatus.innerHTML = '<div>❌ No valid messages found.</div>';
            loadingIndicator.style.display = 'none';
            return;
        }
        
        this.appState.setAllMessages(allMessages);
        const rawData = DataProcessor.convertToDataFormat(allMessages);
        this.appState.setRawData(rawData);
        this.appState.loadedFiles = fileList;
        
        const totalMessages = allMessages.length;
        const totalContacts = fileList.length;
        const dateRange = rawData.length > 0 ? 
            `${rawData[0].date.toLocaleDateString()} to ${rawData[rawData.length - 1].date.toLocaleDateString()}` : 'No dates';
        
        let fileListHtml = '<div class="file-list">';
        fileList.forEach(file => {
            fileListHtml += `<div class="file-item"><span class="contact-name">${file.name}</span><span class="message-count">${file.messageCount} messages</span></div>`;
        });
        fileListHtml += '</div>';
        
        fileStatus.innerHTML = `
            <div>✅ Successfully loaded ${totalMessages} messages from ${totalContacts} contacts</div>
            <div style="margin-top: 10px; font-size: 12px;">Date range: ${dateRange}</div>
            ${fileListHtml}
        `;
        
        ['controlsSection', 'visualizationsContainer', 'chartContainer', 'wordCloudSection'].forEach(id => {
            document.getElementById(id)?.classList.add('show');
        });
        document.getElementById('legend')?.classList.remove('hide');
        
        loadingIndicator.style.display = 'none';
        console.log(`Loaded ${totalMessages} messages from ${totalContacts} contacts covering ${rawData.length} days`);

        // HACK
        setTimeout(()=>{
            this.updateVisualization()
            this.updateWordAnalysis()
        }, 250)
    }
    
    parseSignalFile(content, filename) {
        const lines = content.split('\n');
        const messages = [];
        let contactName = filename.replace(/\.txt$/, '');
        
        const conversationLine = lines.find(line => line.startsWith('Conversation:'));
        if (conversationLine) {
            const match = conversationLine.match(/Conversation:\s*(.+?)(?:\s*\(|\s*$)/);
            if (match) contactName = match[1].trim();
        }
        
        let currentMessage = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('From: You') || line.startsWith('From: ')) {
                if (currentMessage?.sent) messages.push(currentMessage);
                
                currentMessage = {
                    contact: contactName,
                    isOutgoing: line.startsWith('From: You'),
                    sent: null,
                    type: null,
                    text: ''
                };
            } else if (line.startsWith('Type:') && currentMessage) {
                currentMessage.type = line.replace('Type:', '').trim();
            } else if (line.startsWith('Sent:') && currentMessage) {
                const dateStr = line.replace('Sent:', '').trim();
                try {
                    currentMessage.sent = new Date(dateStr);
                    currentMessage.text = this.extractMessageText(content, lines, i + 1);
                } catch (e) {
                    console.warn('Failed to parse date:', dateStr);
                }
            }
        }
        
        if (currentMessage?.sent) messages.push(currentMessage);
        
        return messages.filter(msg => 
            msg.type !== 'call-history' && msg.sent && msg.sent.getTime() > 0 && msg.sent.getFullYear() > 1970
        );
    }
    
    extractMessageText(content, messageLines, startIndex) {
        let text = '', i = startIndex, inQuote = false, inEditHistory = false;
        
        while (i < messageLines.length) {
            const line = messageLines[i].trim();
            
            if (line.startsWith('From: ') || line.startsWith('Conversation:')) break;
            if (line.startsWith('Type:') || line.startsWith('Sent:') || line.startsWith('Received:') || 
                line.startsWith('Reaction:') || line.startsWith('Attachment:') || line.startsWith('Edited:')) {
                i++; continue;
            }
            
            if (line.startsWith('>')) { inQuote = true; i++; continue; }
            if (line.startsWith('|')) { inEditHistory = true; i++; continue; }
            
            if (line.length === 0) {
                inQuote = inEditHistory = false;
                i++; continue;
            }
            
            if (!inQuote && !inEditHistory) text += line + ' ';
            i++;
        }
        
        return text.trim();
    }
    
    updateVisualization() {
        if (this.appState.rawData.length === 0) return;
        
        const intervalDays = parseInt(document.getElementById('timeInterval')?.value) || 7;
        const processedData = DataProcessor.processData(
            this.appState.rawData, intervalDays, this.appState.currentRangeDays,
            this.appState.customStartDate, this.appState.customEndDate
        );
        
        this.appState.setProcessedData(processedData);
        
        if (processedData.length > 0) {
            const result = this.streamgraphView.render(
                processedData, this.appState.highlightedContact, intervalDays,
                (...args) => this.handleStreamgraphHover(...args),
                (...args) => this.handleStreamgraphLeave(...args)
            );
            
            if (result) this.updateLegend(result.contacts, result.contactData);
        }
        
        this.updateCurrentSettings();
    }
    
    updateWordAnalysis() {
        if (!this.appState.allMessages?.length) return;
        
        const contactFilter = document.getElementById('contactFilter')?.value || 'all';
        const messageSource = document.getElementById('messageSource')?.value || 'all';
        const minWordLength = parseInt(document.getElementById('minWordLength')?.value || 3);
        const maxWords = parseInt(document.getElementById('maxWords')?.value || 100);
        
        const wordResult = DataProcessor.generateWordFrequencies(
            this.appState.allMessages, contactFilter, messageSource, minWordLength
        );
        
        const wordCloudData = DataProcessor.generateWordCloudData(
            wordResult.wordFrequencies, wordResult.wordFirstAppearance, wordResult.wordLastAppearance, maxWords
        );
        
        this.appState.setWordData(
            wordResult.wordFrequencies, wordResult.wordFirstAppearance, wordResult.wordLastAppearance, wordCloudData
        );
        
        // Update UI stats
        ['totalWords', 'uniqueWords', 'analyzedMessages'].forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.textContent = [wordResult.totalWords, wordResult.uniqueWords, wordResult.processedMessages][i].toLocaleString();
        });
        
        this.updateWordCloudFilterDisplay();
        
        const isListView = document.getElementById('wordList')?.style.display !== 'none';
        this.wordAnalysisView.switchView(
            isListView ? 'list' : 'cloud', wordCloudData,
            (event, word, isMove = false) => this.handleWordHover(event, word, isMove),
            (event, word) => this.handleWordLeave(event, word)
        );
    }
    
    updateLanguageAnalysis() {
        if (!this.appState.allMessages?.length) return;
        
        // Only update if language analysis tab is currently active
        const languageTab = document.getElementById('languageTab');
        const isLanguageTabActive = languageTab?.classList.contains('tab-active');
        
        if (isLanguageTabActive && languageAnalyzer) {
            languageAnalyzer.createAnalysis();
        }
    }
    
    handleStreamgraphHover(event, streamgraphView, data, stackedData, streams, contacts, intervalDays) {
        const [mouseX, mouseY] = d3.pointer(event, event.target);
        
        // Find closest data point
        const mouseDate = streamgraphView.xScale.invert(mouseX);
        const closest = data.reduce((prev, curr) => 
            Math.abs(curr.date - mouseDate) < Math.abs(prev.date - mouseDate) ? curr : prev
        );
        
        // Calculate time interval highlight
        const intervalWidth = this.calculateIntervalWidth(closest.date, intervalDays, streamgraphView.xScale);
        const intervalStartX = streamgraphView.xScale(closest.date);
        
        // Show time interval highlight
        streamgraphView.timeHighlight.style('display', 'block')
            .style('left', (intervalStartX + streamgraphView.margin.left) + 'px')
            .style('width', intervalWidth + 'px')
            .style('top', streamgraphView.margin.top + 'px')
            .style('height', streamgraphView.height + 'px');
        
        // Find which contact the mouse is over
        const stackPoint = stackedData.map(contactStack => {
            const dataPoint = contactStack.find(d => d.data.originalData === closest);
            if (!dataPoint) return null;
            
            const y0 = streamgraphView.yScale(dataPoint[0]);
            const y1 = streamgraphView.yScale(dataPoint[1]);
            
            return {
                contact: contactStack.key,
                y0: y0,
                y1: y1,
                inRange: mouseY >= y1 && mouseY <= y0,
                data: closest.contacts[contactStack.key]
            };
        }).filter(d => d !== null);
        
        // Find the hovered contact (or default to first)
        const hoveredContact = stackPoint.find(d => d.inRange);
        const contactName = hoveredContact ? hoveredContact.contact : stackPoint[0]?.contact || contacts[0];
        const contactData = closest.contacts[contactName] || { sent: 0, received: 0, total: 0 };
        
        // Calculate stats
        const sendRate = contactData.total > 0 ? ((contactData.sent / contactData.total) * 100).toFixed(1) : 0;
        const avgPerDay = (contactData.total / intervalDays).toFixed(1);
        
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
        streamgraphView.tooltip
            .style("opacity", 1)
            .html(`
                <div class="tooltip-header">
                    <div class="tooltip-contact">${contactName}</div>
                    <div class="tooltip-date">${intervalDays} day${intervalDays > 1 ? 's' : ''}</div>
                </div>
                <div class="tooltip-stats">
                    <div class="stat-row">
                        <span class="stat-label">Period:</span>
                        <span class="stat-value">${dateDisplay}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Total Messages:</span>
                        <span class="stat-value highlight">${contactData.total}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Messages Sent:</span>
                        <span class="stat-value">${contactData.sent}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Messages Received:</span>
                        <span class="stat-value">${contactData.received}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Send Rate:</span>
                        <span class="stat-value">${sendRate}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Avg per Day:</span>
                        <span class="stat-value">${avgPerDay} msgs</span>
                    </div>
                </div>
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 10) + "px");
        
        // Highlight the hovered stream
        streams.attr("opacity", d => d.key === contactName ? 0.9 : 0.4);
        
        // Update word cloud only if we've moved to a different time interval
        const intervalKey = closest.date.toISOString().split('T')[0];
        if (this.currentHoveredInterval !== intervalKey) {
            this.currentHoveredInterval = intervalKey;
            const contactForWordCloud = this.appState.highlightedContact || null;
            
            // Update both word cloud and word list if in list view
            if (document.getElementById('wordList').style.display !== 'none') {
                this.wordAnalysisView.generateListFromTimeInterval(closest.date, intervalDays, contactForWordCloud);
            } else {
                this.wordAnalysisView.generateCloudFromTimeInterval(closest.date, intervalDays, contactForWordCloud);
            }
        }
        
        this.appState.currentHoverData = { contact: contactName, data: closest };
    }
    
    handleStreamgraphLeave(event, streamgraphView, streams, highlightedContact) {
        streamgraphView.timeHighlight.style('display', 'none');
        streamgraphView.tooltip.style("opacity", 0);
        
        // Restore highlighting state instead of uniform opacity
        streams.attr("opacity", (d) => {
            if (highlightedContact === null) {
                return 0.7;
            }
            return d.key === highlightedContact ? 0.9 : 0.2;
        });
        
        // Restore original view (word cloud or word list)
        if (document.getElementById('wordList').style.display !== 'none') {
            this.wordAnalysisView.renderList(this.appState.wordCloudData, this.handleWordHover, this.handleWordLeave);
        } else {
            this.wordAnalysisView.renderCloud(this.appState.wordCloudData, this.handleWordHover, this.handleWordLeave);
        }
        
        this.appState.currentHoverData = null;
        this.currentHoveredInterval = null;
    }
    
    calculateIntervalWidth(date, intervalDays, xScale) {
        const intervalStart = new Date(date);
        const intervalEnd = new Date(intervalStart.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
        const startX = xScale(intervalStart);
        const endX = xScale(intervalEnd);
        return Math.max(endX - startX, 8);
    }
    
    handleWordHover(event, word, isMove = false) {
        this.wordAnalysisView.showTooltip(event, word, isMove);
        if (!isMove) this.streamgraphView.highlightTimeRange(word.firstAppearance, word.lastAppearance);
    }
    
    handleWordLeave(event, word) {
        this.wordAnalysisView.hideTooltip();
        this.streamgraphView.hideTimeRange();
    }
    
    handleContactHighlighting() {
        const contactFilter = document.getElementById('contactFilter')?.value || 'all';
        this.appState.setHighlightedContact(contactFilter === 'all' ? null : contactFilter);
    }
    
    populateContactFilter() {
        const contactFilter = document.getElementById('contactFilter');
        if (!contactFilter) return;
        
        const contacts = [...new Set(this.appState.allMessages.map(m => m.contact))].sort();
        contactFilter.innerHTML = '<option value="all">All Contacts</option>';
        contacts.forEach(contact => {
            const option = document.createElement('option');
            option.value = option.textContent = contact;
            contactFilter.appendChild(option);
        });
    }
    
    updateWordCloudFilterDisplay() {
        const filterDisplay = document.getElementById('wordCloudFilterDisplay');
        if (!filterDisplay) return;
        
        const contactFilter = document.getElementById('contactFilter')?.value || 'all';
        const messageSource = document.getElementById('messageSource')?.value || 'all';
        
        let filterText = contactFilter !== 'all' ? `Contact: ${contactFilter}` : '';
        if (messageSource !== 'all') {
            const sourceText = messageSource === 'sent' ? 'Only Sent Messages' : 'Only Received Messages';
            filterText += filterText ? ` • ${sourceText}` : sourceText;
        }
        
        filterDisplay.textContent = `Filtering: ${filterText || 'All Contacts • All Messages'}`;
    }
    
    updateCurrentSettings() {
        if (this.appState.rawData.length === 0) return;
        
        const intervalDays = parseInt(document.getElementById('timeInterval')?.value || 7);
        const rangeDays = this.appState.currentRangeDays || 180;
        
        const timeBuckets = rangeDays === -1 ? 
            Math.ceil(this.appState.rawData.length * 1 / intervalDays) : 
            Math.ceil(rangeDays / intervalDays);
        
        const totalMessages = this.appState.rawData.reduce((sum, day) => {
            return sum + Object.values(day.contacts).reduce((daySum, contact) => daySum + contact.total, 0);
        }, 0);
        
        // Show more intuitive date range info
        let dateRangeText = 'No data';
        if (this.appState.rawData.length > 0) {
            if (this.appState.customStartDate && this.appState.customEndDate) {
                dateRangeText = `${this.appState.customStartDate.toLocaleDateString()} to ${this.appState.customEndDate.toLocaleDateString()} (Custom)`;
            } else if (rangeDays === -1) {
                dateRangeText = `${this.appState.rawData[0].date.toLocaleDateString()} to ${this.appState.rawData[this.appState.rawData.length - 1].date.toLocaleDateString()} (All data)`;
            } else {
                const endDate = this.appState.rawData[this.appState.rawData.length - 1].date;
                const startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - rangeDays);
                dateRangeText = `Last ${rangeDays === 30 ? '1 month' : 
                                     rangeDays === 90 ? '3 months' : 
                                     rangeDays === 180 ? '6 months' :
                                     rangeDays === 365 ? '1 year' :
                                     rangeDays === 730 ? '2 years' :
                                     `${rangeDays} days`}`;
            }
        }
        
        // Update UI elements
        const currentTimeBuckets = document.getElementById('currentTimeBuckets');
        const totalMessagesEl = document.getElementById('totalMessages');
        const dateCoverage = document.getElementById('dateCoverage');
        
        if (currentTimeBuckets) currentTimeBuckets.textContent = `~${timeBuckets} periods`;
        if (totalMessagesEl) totalMessagesEl.textContent = totalMessages.toLocaleString();
        if (dateCoverage) dateCoverage.textContent = dateRangeText;
    }
    
    updateLegend(contacts, contactData) {
        const legend = d3.select("#legend");
        console.log(legend)
        
        const items = legend.selectAll(".legend-item")
            .data(contacts, d => d);
        
        items.exit().remove();
        
        const newItems = items.enter()
            .append("div")
            .attr("class", "legend-item");
        
        newItems.append("div")
            .attr("class", "legend-color");
        
        newItems.append("span");
        
        const allItems = newItems.merge(items);
        
        allItems.select(".legend-color")
            .style("background-color", contact => contactData[contact].color);
        
        allItems.select("span")
            .text(d => d);
        
        // Add click functionality to legend items
        allItems
            .style("cursor", "pointer")
            .on("click", (event, contact) => {
                this.handleLegendClick(contact);
            });
        
        // Apply highlighting to legend items
        allItems
            .style("opacity", (contact) => {
                if (this.appState.highlightedContact === null) {
                    return 1; // Normal opacity for all
                }
                return contact === this.appState.highlightedContact ? 1 : 0.4; // Dim non-selected contacts
            })
            .style("transform", (contact) => {
                if (this.appState.highlightedContact === null) {
                    return "scale(1)"; // Normal scale
                }
                return contact === this.appState.highlightedContact ? "scale(1.05)" : "scale(1)"; // Slightly enlarge selected
            });
    }
    
    handleLegendClick(contact) {
        const contactFilter = document.getElementById('contactFilter');
        
        // If clicking on currently selected contact, deselect (show all)
        if (this.appState.highlightedContact === contact) {
            if (contactFilter) contactFilter.value = 'all';
            this.appState.setHighlightedContact(null);
        } else {
            // Select the clicked contact
            if (contactFilter) contactFilter.value = contact;
            this.appState.setHighlightedContact(contact);
        }
        
        // Update word cloud to reflect the new filter
        this.updateWordAnalysis();
        this.updateLegend()
    }
    
    handleResponsiveControls() {
        const controlsSection = document.getElementById('controlsSection');
        const collapseIcon = document.getElementById('collapseIcon');
        
        if (window.innerWidth <= 900) {
            controlsSection?.classList.add('auto-collapsed');
            controlsSection?.classList.remove('collapsed');
            if (collapseIcon) collapseIcon.textContent = '▶';
        } else {
            controlsSection?.classList.remove('auto-collapsed');
            if (!controlsSection?.classList.contains('collapsed') && collapseIcon) {
                collapseIcon.textContent = '▼';
            }
        }
    }
    
    setDateRange(days) {
        document.querySelectorAll('.join-item').forEach(btn => btn.classList.remove('btn-active'));
        if (event?.target) event.target.classList.add('btn-active');
        
        ['startDate', 'endDate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        this.appState.setTimeRange(days);
    }
    
    handleCustomDateChange() {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        
        if (startDate && endDate) {
            document.querySelectorAll('.join-item').forEach(btn => btn.classList.remove('btn-active'));
            
            const start = new Date(startDate), end = new Date(endDate);
            const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
            
            this.appState.setTimeRange(diffDays, start, end);
        }
    }
    
    toggleControls() {
        const controlsSection = document.getElementById('controlsSection');
        const collapseIcon = document.getElementById('collapseIcon');
        
        if (window.innerWidth <= 900 && controlsSection?.classList.contains('auto-collapsed')) return;
        
        controlsSection?.classList.toggle('collapsed');
        if (collapseIcon) {
            collapseIcon.textContent = controlsSection?.classList.contains('collapsed') ? '▶' : '▼';
        }
    }
    
    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('tab-active'));
        
        document.getElementById(`${tabName}TabContent`)?.classList.add('active');
        document.getElementById(`${tabName}Tab`)?.classList.add('tab-active');
        
        // Show/hide appropriate legends
        const messageLegend = document.getElementById('legend');
        const languageLegend = document.getElementById('languageLegend');
        
        if (tabName === 'messages') {
            // Show message legend, hide language legend
            if (messageLegend) messageLegend.classList.remove('hide');
            if (languageLegend) languageLegend.classList.add('hide');
            
            if (this.appState.processedData.length > 0) {
                this.updateVisualization();
            }
        } else if (tabName === 'language') {
            // Hide message legend, language legend will be shown in createAnalysis if data exists
            if (messageLegend) messageLegend.classList.add('hide');
            
            if (this.appState.rawData.length > 0) {
                languageAnalyzer.createAnalysis();
            }
        }
    }
    
}

// Export for use in other modules
window.ControlsManager = ControlsManager;