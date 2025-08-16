// Streamgraph Visualization Component

class StreamgraphView {
    constructor(containerId) {
        this.containerId = containerId;
        this.margin = { top: 40, right: 40, bottom: 80, left: 80 };
        this.width = null;
        this.height = null;
        this.svg = null;
        this.g = null;
        this.xScale = null;
        this.yScale = null;
        this.tooltip = d3.select("#tooltip");
        this.timeHighlight = d3.select("#timeHighlight");
    }
    
    initialize() {
        const chartContainer = document.getElementById(this.containerId);
        
        // Clear any existing content FIRST before measuring
        d3.select(`#${this.containerId.replace('Container', '')}`).selectAll("*").remove();
        
        // Now measure the container dimensions after clearing
        const containerWidth = chartContainer.clientWidth;
        const containerHeight = chartContainer.clientHeight;
        
        this.width = containerWidth - this.margin.left - this.margin.right;
        this.height = containerHeight - this.margin.top - this.margin.bottom;
        
        this.svg = d3.select(`#${this.containerId.replace('Container', '')}`)
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);

        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
            
        this.initializeScalesAndAxes();
    }
    
    initializeScalesAndAxes() {
        if (!this.g || !this.width || !this.height) return;
        
        this.xScale = d3.scaleTime().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);

        this.xAxis = this.g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${this.height})`);

        this.yAxis = this.g.append("g")
            .attr("class", "axis");

        this.g.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - this.margin.left)
            .attr("x", 0 - (this.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Message Volume");

        this.g.append("text")
            .attr("class", "axis-label")
            .attr("transform", `translate(${this.width / 2}, ${this.height + this.margin.bottom - 20})`)
            .style("text-anchor", "middle")
            .text("Time");
    }
    
    render(data, highlightedContact = null, intervalDays = 7, onHover = null, onLeave = null) {
        if (!data || data.length === 0) {
            console.log('No data to display');
            return;
        }
        
        this.initialize();
        
        const contacts = Object.keys(data[0].contacts);
        const stackData = data.map(d => {
            const item = { date: d.date, originalData: d };
            contacts.forEach(contact => {
                item[contact] = d.contacts[contact].total;
            });
            return item;
        });
        
        const stack = d3.stack()
            .keys(contacts)
            .offset(d3.stackOffsetWiggle);
        
        const stackedData = stack(stackData);
        
        const xDomain = d3.extent(data, d => d.date);
        const yExtent = d3.extent(stackedData.flat(2));
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
        const yDomain = [yExtent[0] - yPadding, yExtent[1] + yPadding];
        
        this.xScale.domain(xDomain);
        this.yScale.domain(yDomain);
        
        const area = d3.area()
            .x(d => this.xScale(d.data.date))
            .y0(d => this.yScale(d[0]))
            .y1(d => this.yScale(d[1]))
            .curve(d3.curveBasis);
        
        this.g.selectAll(".stream").remove();
        this.g.selectAll(".hover-overlay").remove();
        
        const streams = this.g.selectAll(".stream")
            .data(stackedData)
            .enter()
            .append("path")
            .attr("class", "stream")
            .attr("fill", (d) => data[0].contacts[d.key].color)
            .attr("opacity", (d) => {
                if (highlightedContact === null) {
                    return 0.7;
                }
                return d.key === highlightedContact ? 0.9 : 0.2;
            })
            .attr("stroke", (d) => {
                if (highlightedContact === null) {
                    return "white";
                }
                return d.key === highlightedContact ? '#2c3e50' : 'white';
            })
            .attr("stroke-width", (d) => {
                if (highlightedContact === null) {
                    return 0.5;
                }
                return d.key === highlightedContact ? 2 : 0.5;
            })
            .attr("d", area);
        
        // Add hover overlay
        const hoverOverlay = this.g.append("rect")
            .attr("class", "hover-overlay")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("fill", "transparent")
            .style("cursor", "crosshair");
        
        if (onHover) {
            hoverOverlay.on("mousemove", (event) => {
                onHover(event, this, data, stackedData, streams, contacts, intervalDays);
            });
        }
        
        if (onLeave) {
            hoverOverlay.on("mouseleave", (event) => {
                onLeave(event, this, streams, highlightedContact);
            });
        }
        
        this.updateAxes(intervalDays);
        
        return { contacts, contactData: data[0].contacts };
    }
    
    updateAxes(intervalDays) {
        let formatFunction;
        let tickValues = null;
        
        if (intervalDays === 1) {
            formatFunction = d3.timeFormat('%m/%d');
            tickValues = this.xScale.ticks(d3.timeWeek);
        } else if (intervalDays <= 7) {
            formatFunction = d3.timeFormat('%m/%d');
            tickValues = this.xScale.ticks(d3.timeWeek.every(2));
        } else if (intervalDays <= 31) {
            formatFunction = d3.timeFormat('%b %d');
            tickValues = this.xScale.ticks(d3.timeMonth);
        } else {
            formatFunction = d3.timeFormat('%b %Y');
            tickValues = this.xScale.ticks(d3.timeMonth.every(3));
        }
        
        const xAxisGenerator = d3.axisBottom(this.xScale)
            .tickFormat(formatFunction)
            .tickSizeOuter(0);
        
        if (tickValues) {
            xAxisGenerator.tickValues(tickValues);
        }
        
        this.xAxis.call(xAxisGenerator);
        this.xAxis.selectAll("text")
            .style("text-anchor", "middle")
            .style("font-size", "11px")
            .style("fill", "#666");
        
        this.yAxis.call(d3.axisLeft(this.yScale));
    }
    
    highlightTimeRange(firstAppearance, lastAppearance) {
        if (!this.xScale || !firstAppearance || !lastAppearance) {
            this.timeHighlight.style('display', 'none');
            return;
        }
        
        const startX = this.xScale(firstAppearance);
        const endX = this.xScale(lastAppearance);
        const rangeWidth = Math.max(endX - startX, 2);
        
        this.timeHighlight.style('display', 'block')
            .style('left', (startX + this.margin.left) + 'px')
            .style('width', rangeWidth + 'px')
            .style('top', this.margin.top + 'px')
            .style('height', this.height + 'px');
    }
    
    hideTimeRange() {
        this.timeHighlight.style('display', 'none');
    }
    
    calculateIntervalWidth(intervalDate, intervalDays) {
        const endDate = new Date(intervalDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
        const startX = this.xScale(intervalDate);
        const endX = this.xScale(endDate);
        return Math.max(endX - startX, 8);
    }
}

// Export for use in other modules
window.StreamgraphView = StreamgraphView;