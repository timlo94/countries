/**
 * charts.js - D3.js v7 chart library for Universal Country Insights Dashboard
 */

// Shared Tooltip Logic
const tooltip = document.getElementById('tooltip') || createTooltipDiv();

function createTooltipDiv() {
  const div = document.createElement('div');
  div.id = 'tooltip';
  div.style.position = 'absolute';
  div.style.opacity = '0';
  div.style.pointerEvents = 'none';
  div.style.backgroundColor = 'rgba(22, 27, 34, 0.95)';
  div.style.border = '1px solid #30363d';
  div.style.borderRadius = '6px';
  div.style.padding = '12px';
  div.style.color = '#c9d1d9';
  div.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  div.style.fontSize = '14px';
  div.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
  div.style.zIndex = '1000';
  div.style.transition = 'opacity 0.2s';
  document.body.appendChild(div);
  return div;
}

/**
 * Show the global tooltip
 * @param {MouseEvent} event 
 * @param {string} html 
 */
function showTooltip(event, html) {
  tooltip.innerHTML = html;
  tooltip.style.opacity = 1;
  positionTooltip(event);
}

/**
 * Hide the global tooltip
 */
function hideTooltip() {
  tooltip.style.opacity = 0;
}

/**
 * Position the tooltip based on mouse event
 * @param {MouseEvent} event 
 */
function positionTooltip(event) {
  let x = event.pageX + 15;
  let y = event.pageY + 15;
  if (x + 250 > window.innerWidth) x = event.pageX - 260;
  if (y + 200 > window.innerHeight) y = event.pageY - 210;
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}

/**
 * Format metric value based on its type defined in METRICS
 * @param {number} value 
 * @param {string} metricKey 
 * @returns {string} Formatted value
 */
function formatMetricValue(value, metricKey) {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  
  const metric = (typeof METRICS !== 'undefined' && METRICS[metricKey]) ? METRICS[metricKey] : {};
  const formatType = metric.format || 'number';
  
  if (formatType === 'currency') {
    if (value >= 1e12) return '$' + (value / 1e12).toFixed(2) + 'T';
    if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
    return d3.format("$,.0f")(value);
  }
  
  if (formatType === 'percent') {
    return d3.format(".1f")(value) + '%';
  }
  
  if (formatType === 'decimal') {
    return d3.format(".3f")(value);
  }
  
  if (formatType === 'score') {
    return d3.format(".2f")(value);
  }
  
  return d3.format(",.0f")(value);
}

/**
 * Clean up a chart container — remove SVG and event listeners.
 * @param {string} containerId
 */
function destroyChart(containerId) {
  const container = d3.select(`#${containerId}`);
  if (!container.empty()) {
    container.selectAll('*').remove();
  }
}

/**
 * Helper to get color for a continent
 */
function getContinentColor(continentName) {
  if (typeof CONTINENTS !== 'undefined' && CONTINENTS[continentName]) {
    return CONTINENTS[continentName].color;
  }
  return '#7d8590';
}

/**
 * 1. createDonutChart
 * @param {string} containerId
 * @param {Array} data
 * @param {string} metricKey
 * @param {Object} options
 */
function createDonutChart(containerId, data, metricKey, options = {}) {
  destroyChart(containerId);
  if (!data || !data.length) return;

  const validData = data.filter(d => d[metricKey] != null && !isNaN(d[metricKey]));
  if (!validData.length) return;

  const showLabels = options.showLabels !== false;
  
  const width = 600;
  const height = 400;
  const margin = 40;
  const radius = Math.min(width, height) / 2 - margin;
  
  const svg = d3.select(`#${containerId}`)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("max-width", "100%")
    .style("height", "auto")
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);
    
  const pie = d3.pie()
    .value(d => d[metricKey])
    .sort((a, b) => b[metricKey] - a[metricKey]);
    
  const arc = d3.arc()
    .innerRadius(radius * 0.4)
    .outerRadius(radius);
    
  const arcHover = d3.arc()
    .innerRadius(radius * 0.4)
    .outerRadius(radius * 1.05);
    
  const totalValue = d3.sum(validData, d => d[metricKey]);
  const metricInfo = typeof METRICS !== 'undefined' && METRICS[metricKey] ? METRICS[metricKey] : {};
  const metricLabel = metricInfo.label || metricKey;
  
  // Center text
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.2em")
    .attr("font-size", "24px")
    .attr("font-weight", "bold")
    .attr("fill", "#c9d1d9")
    .text(formatMetricValue(totalValue, metricKey));
    
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "1.2em")
    .attr("font-size", "14px")
    .attr("fill", "#7d8590")
    .text("Total " + metricLabel);

  const paths = svg.selectAll("path")
    .data(pie(validData), d => d.data.name)
    .enter()
    .append("path")
    .attr("fill", d => getContinentColor(d.data.continent))
    .attr("stroke", "#0d1117")
    .attr("stroke-width", "2px")
    .each(function(d) { this._current = d; });
    
  // Transitions
  paths.transition().duration(750)
    .attrTween("d", function(d) {
      const i = d3.interpolate({startAngle: 0, endAngle: 0}, d);
      return function(t) { return arc(i(t)); };
    });

  // Interactivity
  paths
    .on("mouseover", function(event, d) {
      paths.style("opacity", 0.3);
      d3.select(this)
        .style("opacity", 1)
        .transition().duration(200)
        .attr("d", arcHover);
        
      const percentage = ((d.data[metricKey] / totalValue) * 100).toFixed(1);
      const html = `
        <div style="font-weight:bold;margin-bottom:4px;">${d.data.flag} ${d.data.name}</div>
        <div>${metricLabel}: <span style="color:#58a6ff">${formatMetricValue(d.data[metricKey], metricKey)}</span></div>
        <div style="color:#8b949e;font-size:12px;margin-top:2px;">${percentage}% of total</div>
        <div style="color:#8b949e;font-size:12px;">Continent: ${d.data.continent}</div>
      `;
      showTooltip(event, html);
    })
    .on("mousemove", positionTooltip)
    .on("mouseout", function(event, d) {
      paths.style("opacity", 1);
      d3.select(this)
        .transition().duration(200)
        .attr("d", arc);
      hideTooltip();
    });
}

/**
 * 2. createBarChart
 * @param {string} containerId
 * @param {Array} data
 * @param {string} metricKey
 * @param {Object} options
 */
function createBarChart(containerId, data, metricKey, options = {}) {
  destroyChart(containerId);
  if (!data || !data.length) return;

  const validData = data.filter(d => d[metricKey] != null && !isNaN(d[metricKey]));
  validData.sort((a, b) => b[metricKey] - a[metricKey]);
  
  const limit = options.limit || 10;
  const chartData = validData.slice(0, limit);
  if (!chartData.length) return;

  const width = 800;
  const height = Math.max(400, chartData.length * 40 + 60);
  const margin = { top: 30, right: 100, bottom: 20, left: 150 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("max-width", "100%")
    .style("height", "auto")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d[metricKey])])
    .range([0, innerWidth]);

  const y = d3.scaleBand()
    .domain(chartData.map(d => d.name))
    .range([0, innerHeight])
    .padding(0.2);

  // Axes
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0))
    .selectAll("text").attr("fill", "#7d8590");
    
  svg.select(".x-axis").selectAll("path, line").attr("stroke", "#484f58");

  const yAxis = svg.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y).tickSize(0));
    
  yAxis.selectAll("text")
    .attr("fill", "#c9d1d9")
    .attr("font-size", "14px")
    .each(function(d) {
      const country = chartData.find(c => c.name === d);
      if (country && options.showFlags !== false) {
        d3.select(this).text(`${country.flag} ${d}`);
      }
    });
    
  yAxis.select(".domain").remove();

  // Bars
  const bars = svg.selectAll(".bar")
    .data(chartData, d => d.name)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("y", d => y(d.name))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("width", 0)
    .attr("fill", d => getContinentColor(d.continent))
    .attr("rx", 3);

  bars.transition().duration(750)
    .attr("width", d => x(d[metricKey]));

  // Labels
  svg.selectAll(".label")
    .data(chartData, d => d.name)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("y", d => y(d.name) + y.bandwidth() / 2)
    .attr("x", 0)
    .attr("dy", "0.35em")
    .attr("dx", "5px")
    .attr("fill", "#c9d1d9")
    .attr("font-size", "12px")
    .style("opacity", 0)
    .text(d => formatMetricValue(d[metricKey], metricKey))
    .transition().duration(750).delay(100)
    .attr("x", d => x(d[metricKey]))
    .style("opacity", 1);

  // Interactivity
  const metricInfo = typeof METRICS !== 'undefined' && METRICS[metricKey] ? METRICS[metricKey] : {};
  const metricLabel = metricInfo.label || metricKey;

  bars
    .on("mouseover", function(event, d) {
      bars.style("opacity", 0.5);
      d3.select(this).style("opacity", 1).attr("fill", d3.color(getContinentColor(d.continent)).brighter(0.2));
      
      const html = `
        <div style="font-weight:bold;margin-bottom:4px;">${d.flag} ${d.name}</div>
        <div>${metricLabel}: <span style="color:#58a6ff">${formatMetricValue(d[metricKey], metricKey)}</span></div>
        <div style="color:#8b949e;font-size:12px;margin-top:2px;">Continent: ${d.continent}</div>
      `;
      showTooltip(event, html);
    })
    .on("mousemove", positionTooltip)
    .on("mouseout", function(event, d) {
      bars.style("opacity", 1).attr("fill", getContinentColor(d.continent));
      hideTooltip();
    });
}

/**
 * 3. createRadarChart
 * @param {string} containerId
 * @param {Array} countries
 * @param {Array} dimensions
 * @param {Object} options
 */
function createRadarChart(containerId, countries, dimensions, options = {}) {
  destroyChart(containerId);
  if (!countries || !countries.length) return;
  const validCountries = countries.slice(0, 4);

  const defaultDimensions = [
    { key: 'gdpPerCapita', label: 'Economy', maxValue: 120000, normalize: v => v },
    { key: 'hdi', label: 'Education', maxValue: 1, normalize: v => v },
    { key: 'lifeExpectancy', label: 'Health', maxValue: 90, normalize: v => v },
    { key: 'safetyIndex', label: 'Safety', maxValue: 100, normalize: v => v },
    { key: 'democracyIndex', label: 'Governance', maxValue: 10, normalize: v => v },
    { key: 'corruptionIndex', label: 'Transparency', maxValue: 100, normalize: v => v },
    { key: 'internetUsers', label: 'Digital', maxValue: 100, normalize: (v, c) => (v / c.population) * 100 },
    { key: 'costOfLiving', label: 'Affordability', maxValue: 100, normalize: v => 100 - v }
  ];

  const dims = dimensions || defaultDimensions;
  
  const width = 600;
  const height = 500;
  const margin = 60;
  const radius = Math.min(width, height) / 2 - margin;
  const angleSlice = (Math.PI * 2) / dims.length;
  
  const svg = d3.select(`#${containerId}`)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("max-width", "100%")
    .style("height", "auto")
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2 + 20})`); // Offset for legend

  const colors = ['#58a6ff', '#3fb950', '#f85149', '#bc8cff'];

  // Grid Circles
  const levels = 5;
  for (let i = 0; i < levels; i++) {
    const levelFactor = radius * ((i + 1) / levels);
    svg.append("circle")
      .attr("r", levelFactor)
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.06)")
      .attr("stroke-width", "1px");
  }

  // Axes
  const axis = svg.selectAll(".axis")
    .data(dims)
    .enter()
    .append("g")
    .attr("class", "axis");

  axis.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", (d, i) => radius * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y2", (d, i) => radius * Math.sin(angleSlice * i - Math.PI / 2))
    .attr("stroke", "rgba(255, 255, 255, 0.06)")
    .attr("stroke-width", "2px");

  axis.append("text")
    .attr("class", "legend")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("x", (d, i) => (radius + 25) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y", (d, i) => (radius + 25) * Math.sin(angleSlice * i - Math.PI / 2))
    .attr("fill", "#7d8590")
    .attr("font-size", "12px")
    .text(d => d.label);

  // Helper to calculate radar points
  const getRadarPoints = (country) => {
    return dims.map((dim, i) => {
      let rawVal = country[dim.key] || 0;
      let val = dim.normalize ? dim.normalize(rawVal, country) : rawVal;
      let r = Math.max(0, Math.min(val / dim.maxValue, 1)) * radius;
      return {
        x: r * Math.cos(angleSlice * i - Math.PI / 2),
        y: r * Math.sin(angleSlice * i - Math.PI / 2),
        val: val,
        raw: rawVal,
        label: dim.label,
        key: dim.key
      };
    });
  };

  const radarLine = d3.line()
    .x(d => d.x)
    .y(d => d.y)
    .curve(d3.curveLinearClosed);

  // Polygons
  validCountries.forEach((country, cIdx) => {
    const pts = getRadarPoints(country);
    
    // Polygon
    svg.append("path")
      .datum(pts)
      .attr("class", `radar-polygon radar-polygon-${cIdx}`)
      .attr("d", radarLine)
      .attr("fill", colors[cIdx % colors.length])
      .attr("fill-opacity", 0.2)
      .attr("stroke", colors[cIdx % colors.length])
      .attr("stroke-width", 2)
      .style("opacity", 0)
      .transition().duration(750)
      .style("opacity", 1);
      
    // Interactive areas
    svg.append("path")
      .datum(pts)
      .attr("d", radarLine)
      .attr("fill", "transparent")
      .attr("stroke", "transparent")
      .attr("stroke-width", 15)
      .on("mouseover", function() {
        svg.selectAll(".radar-polygon").style("fill-opacity", 0.05).style("stroke-opacity", 0.3);
        svg.select(`.radar-polygon-${cIdx}`).style("fill-opacity", 0.5).style("stroke-opacity", 1);
      })
      .on("mouseout", function() {
        svg.selectAll(".radar-polygon").style("fill-opacity", 0.2).style("stroke-opacity", 1);
      });

    // Vertices
    svg.selectAll(`.vertex-${cIdx}`)
      .data(pts)
      .enter()
      .append("circle")
      .attr("class", `vertex-${cIdx}`)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 4)
      .attr("fill", colors[cIdx % colors.length])
      .style("opacity", 0)
      .transition().duration(750).delay(100)
      .style("opacity", 1);
      
    svg.selectAll(`.vertex-hover-${cIdx}`)
      .data(pts)
      .enter()
      .append("circle")
      .attr("class", `vertex-hover-${cIdx}`)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 10)
      .attr("fill", "transparent")
      .on("mouseover", function(event, d) {
        d3.select(this).style("cursor", "pointer");
        let formatted = typeof METRICS !== 'undefined' && METRICS[d.key] ? formatMetricValue(d.raw, d.key) : d3.format(".2f")(d.raw);
        const html = `
          <div style="font-weight:bold;color:${colors[cIdx % colors.length]}">${country.flag} ${country.name}</div>
          <div>${d.label}: <span>${formatted}</span></div>
        `;
        showTooltip(event, html);
      })
      .on("mousemove", positionTooltip)
      .on("mouseout", hideTooltip);
  });

  // Legend
  const legend = d3.select(`#${containerId} svg`).append("g")
    .attr("transform", `translate(${margin}, 20)`);
    
  validCountries.forEach((c, i) => {
    const lg = legend.append("g")
      .attr("transform", `translate(${i * 120}, 0)`);
    lg.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", colors[i % colors.length])
      .attr("rx", 2);
    lg.append("text")
      .attr("x", 20)
      .attr("y", 10)
      .text(`${c.name}`)
      .attr("fill", "#c9d1d9")
      .attr("font-size", "12px");
  });
}

/**
 * 4. createScatterPlot
 * @param {string} containerId
 * @param {Array} data
 * @param {string} xMetric
 * @param {string} yMetric
 * @param {Object} options
 */
function createScatterPlot(containerId, data, xMetric, yMetric, options = {}) {
  destroyChart(containerId);
  if (!data || !data.length) return;

  const validData = data.filter(d => d[xMetric] != null && d[yMetric] != null && !isNaN(d[xMetric]) && !isNaN(d[yMetric]));
  if (!validData.length) return;

  const sizeMetric = options.sizeMetric || 'population';
  
  const width = 800;
  const height = 500;
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("max-width", "100%")
    .style("height", "auto")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(validData, d => d[xMetric])).nice()
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain(d3.extent(validData, d => d[yMetric])).nice()
    .range([innerHeight, 0]);

  const sizeExtent = d3.extent(validData, d => d[sizeMetric] || 1);
  const size = d3.scaleSqrt()
    .domain([0, sizeExtent[1]])
    .range([3, 30]);

  // Grid
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(8).tickSize(-innerHeight).tickFormat(""))
    .selectAll("line").attr("stroke", "rgba(255, 255, 255, 0.06)");
    
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(8).tickSize(-innerWidth).tickFormat(""))
    .selectAll("line").attr("stroke", "rgba(255, 255, 255, 0.06)");
    
  svg.selectAll(".grid path").style("display", "none");

  // Axes
  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));
  xAxis.selectAll("text").attr("fill", "#7d8590");
  xAxis.selectAll("line, path").attr("stroke", "#484f58");

  const yAxis = svg.append("g")
    .call(d3.axisLeft(y));
  yAxis.selectAll("text").attr("fill", "#7d8590");
  yAxis.selectAll("line, path").attr("stroke", "#484f58");

  const getLabel = (k) => (typeof METRICS !== 'undefined' && METRICS[k]) ? METRICS[k].label : k;

  // Axis Labels
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + margin.bottom - 15)
    .attr("fill", "#7d8590")
    .text(getLabel(xMetric));

  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 25)
    .attr("x", -innerHeight / 2)
    .attr("fill", "#7d8590")
    .text(getLabel(yMetric));

  // Calculate Pearson correlation coefficient
  let correlation = 0;
  if (validData.length > 1) {
    const xMean = d3.mean(validData, d => d[xMetric]);
    const yMean = d3.mean(validData, d => d[yMetric]);
    let num = 0, denX = 0, denY = 0;
    
    validData.forEach(d => {
      const dx = d[xMetric] - xMean;
      const dy = d[yMetric] - yMean;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    });
    
    const denom = Math.sqrt(denX * denY);
    if (denom > 0) {
      correlation = num / denom;
    }
  }

  // Trend line (Linear Regression)
  if (options.showTrendLine !== false && validData.length > 1) {
    const xMean = d3.mean(validData, d => d[xMetric]);
    const yMean = d3.mean(validData, d => d[yMetric]);
    let num = 0, denX = 0;
    
    validData.forEach(d => {
      const dx = d[xMetric] - xMean;
      const dy = d[yMetric] - yMean;
      num += dx * dy;
      denX += dx * dx;
    });
    
    if (denX > 0) {
      const m = num / denX;
      const b = yMean - m * xMean;

      const x1 = d3.min(validData, d => d[xMetric]);
      const x2 = d3.max(validData, d => d[xMetric]);
      const y1 = m * x1 + b;
      const y2 = m * x2 + b;

      svg.append("line")
        .attr("x1", x(x1))
        .attr("y1", y(y1))
        .attr("x2", x(x2))
        .attr("y2", y(y2))
        .attr("stroke", "#7d8590")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .style("opacity", 0)
        .transition().duration(1000)
        .style("opacity", 0.6);
    }
  }

  // Dots
  const dots = svg.selectAll(".dot")
    .data(validData)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", d => x(d[xMetric]))
    .attr("cy", d => y(d[yMetric]))
    .attr("r", 0)
    .attr("fill", d => getContinentColor(d.continent))
    .attr("opacity", 0.7)
    .attr("stroke", "#0d1117")
    .attr("stroke-width", 1);

  dots.transition().duration(750).delay((d, i) => i * 5)
    .attr("r", d => size(d[sizeMetric] || 1));

  // Interactions
  dots
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition().duration(200)
        .attr("r", d => size(d[sizeMetric] || 1) + 4)
        .attr("opacity", 1);
        
      const html = `
        <div style="font-weight:bold;margin-bottom:4px;">${d.flag} ${d.name}</div>
        <div>${getLabel(xMetric)}: <span style="color:#58a6ff">${formatMetricValue(d[xMetric], xMetric)}</span></div>
        <div>${getLabel(yMetric)}: <span style="color:#58a6ff">${formatMetricValue(d[yMetric], yMetric)}</span></div>
        <div style="color:#8b949e;font-size:12px;margin-top:2px;">${getLabel(sizeMetric)}: ${formatMetricValue(d[sizeMetric], sizeMetric)}</div>
      `;
      showTooltip(event, html);
    })
    .on("mousemove", positionTooltip)
    .on("mouseout", function(event, d) {
      d3.select(this)
        .transition().duration(200)
        .attr("r", d => size(d[sizeMetric] || 1))
        .attr("opacity", 0.7);
      hideTooltip();
    });
    
  // Labels for largest dots
  if (options.showLabels !== false) {
    const largestData = [...validData].sort((a, b) => (b[sizeMetric] || 0) - (a[sizeMetric] || 0)).slice(0, 5);
    
    svg.selectAll(".dot-label")
      .data(largestData)
      .enter()
      .append("text")
      .attr("class", "dot-label")
      .attr("x", d => x(d[xMetric]))
      .attr("y", d => y(d[yMetric]) - size(d[sizeMetric] || 1) - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#c9d1d9")
      .attr("font-size", "10px")
      .attr("pointer-events", "none")
      .style("opacity", 0)
      .text(d => d.name)
      .transition().duration(750).delay(500)
      .style("opacity", 1);
  }

  return { correlation };
}

/**
 * 5. createComparisonTable
 * @param {string} containerId
 * @param {Array} countries
 * @param {Array} metricKeys
 */
function createComparisonTable(containerId, countries, metricKeys) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  
  if (!countries || !countries.length || !metricKeys || !metricKeys.length) return;
  
  const validCountries = countries.slice(0, 4);

  // Default CSS classes for table
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.textAlign = 'left';
  table.style.fontSize = '14px';

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.borderBottom = '2px solid #30363d';
  
  let th = document.createElement('th');
  th.style.padding = '12px 8px';
  th.style.color = '#8b949e';
  th.textContent = 'Metric';
  headerRow.appendChild(th);
  
  validCountries.forEach(c => {
    let td = document.createElement('th');
    td.style.padding = '12px 8px';
    td.style.color = '#c9d1d9';
    td.innerHTML = `<span style="font-size:18px;margin-right:8px;">${c.flag}</span>${c.name}`;
    headerRow.appendChild(td);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  
  const verdicts = {};

  metricKeys.forEach((key, index) => {
    const metricInfo = typeof METRICS !== 'undefined' && METRICS[key] ? METRICS[key] : { label: key, higherIsBetter: true };
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #21262d';
    if (index % 2 === 0) tr.style.backgroundColor = 'rgba(255,255,255,0.02)';
    
    const tdLabel = document.createElement('td');
    tdLabel.style.padding = '12px 8px';
    tdLabel.style.color = '#8b949e';
    tdLabel.textContent = metricInfo.label;
    tr.appendChild(tdLabel);
    
    // Find best
    let bestValue = null;
    let bestCountry = null;
    let validValues = [];
    
    validCountries.forEach(c => {
      const val = c[key];
      if (val != null && !isNaN(val)) {
        validValues.push({ val, c });
      }
    });

    if (validValues.length > 0) {
      if (metricInfo.higherIsBetter !== false) {
        validValues.sort((a, b) => b.val - a.val);
      } else {
        validValues.sort((a, b) => a.val - b.val);
      }
      bestValue = validValues[0].val;
      bestCountry = validValues[0].c.name;
      verdicts[key] = bestCountry;
    }

    validCountries.forEach(c => {
      const td = document.createElement('td');
      td.style.padding = '12px 8px';
      
      const val = c[key];
      if (val == null || isNaN(val)) {
        td.textContent = 'N/A';
        td.style.color = '#7d8590';
      } else {
        const isBest = (val === bestValue);
        td.innerHTML = formatMetricValue(val, key) + (isBest ? ' <span title="Best in comparison" style="margin-left:4px;">🏆</span>' : '');
        td.style.color = isBest ? '#3fb950' : '#c9d1d9';
        td.style.fontWeight = isBest ? 'bold' : 'normal';
      }
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  return verdicts;
}


/**
 * Create a Line Chart for Historical Data
 */
function createLineChart(containerId, historyData, metricKey) {
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  destroyChart(containerId);

  const width = container.node().getBoundingClientRect().width;
  const height = container.node().getBoundingClientRect().height || 300;
  const margin = {top: 20, right: 30, bottom: 30, left: 50};

  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  if (!historyData || historyData.length === 0) {
    svg.append('text')
      .attr('x', width/2)
      .attr('y', height/2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-muted)')
      .text('No historical data available');
    return;
  }

  const x = d3.scaleLinear()
    .domain(d3.extent(historyData, d => d.year))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(historyData, d => d[metricKey]) * 1.1])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d[metricKey]))
    .curve(d3.curveMonotoneX);

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')))
    .attr('color', 'var(--text-muted)');

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5))
    .attr('color', 'var(--text-muted)');

  svg.append('path')
    .datum(historyData)
    .attr('fill', 'none')
    .attr('stroke', 'var(--accent-blue)')
    .attr('stroke-width', 2)
    .attr('d', line);

  // Add dots
  svg.selectAll('.dot')
    .data(historyData)
    .enter().append('circle')
    .attr('cx', d => x(d.year))
    .attr('cy', d => y(d[metricKey]))
    .attr('r', 4)
    .attr('fill', 'var(--bg-surface)')
    .attr('stroke', 'var(--accent-blue)')
    .attr('stroke-width', 2)
    .on('mousemove', (event, d) => {
      showTooltip(event, `<strong>Year:</strong> ${d.year}<br><strong>Value:</strong> ${d[metricKey]}`);
    })
    .on('mouseout', hideTooltip);
}

/**
 * Create a Choropleth Map Chart
 */
let worldGeoJson = null;

async function createMapChart(containerId, data, metricKey) {
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  // Only remove SVG if we are redrawing completely, but usually we just want to update colors.
  // For simplicity, we'll redraw
  const oldSvg = container.select('.map-svg');
  if (!oldSvg.empty()) oldSvg.remove();

  const width = container.node().getBoundingClientRect().width || 800;
  const height = container.node().getBoundingClientRect().height || 500;

  const svg = container.insert('svg', ':first-child')
    .attr('class', 'map-svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  if (!worldGeoJson) {
    try {
      worldGeoJson = await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson");
    } catch (e) {
      svg.append('text')
        .attr('x', width/2)
        .attr('y', height/2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-muted)')
        .text('Failed to load map data.');
      return;
    }
  }

  const projection = d3.geoMercator()
    .scale(width / 2 / Math.PI)
    .translate([width / 2, height / 1.5]);

  const path = d3.geoPath().projection(projection);

  // Create a map from country name to its metric value
  const valueMap = new Map();
  data.forEach(d => {
    valueMap.set(d.name, d[metricKey]);
    // Also try to map common aliases if necessary, for now exact match
  });

  const allVals = data.map(d => d[metricKey]).filter(v => v != null && !isNaN(v));
  const min = d3.min(allVals) || 0;
  const max = d3.max(allVals) || 1;
  const meta = METRICS[metricKey] || { higherIsBetter: true };
  
    <div class="map-legend-labels">
      <span>${formatMetricValue(min, metricKey)}</span>
      <span>${formatMetricValue(max, metricKey)}</span>
    </div>
  `);
}
