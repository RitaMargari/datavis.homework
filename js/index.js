const width = 1000;
const barWidth = 500;
const height = 500;
const margin = 30;

const yearLable = d3.select('#year');
const countryName = d3.select('#country-name');

const barChart = d3.select('#bar-chart')
            .attr('width', barWidth)
            .attr('height', height);

const scatterPlot  = d3.select('#scatter-plot')
            .attr('width', width)
            .attr('height', height);

const lineChart = d3.select('#line-chart')
            .attr('width', width)
            .attr('height', height);

let xParam = 'fertility-rate';
let yParam = 'child-mortality';
let rParam = 'gdp';
let year = '2000';
let param = 'child-mortality';
let lineParam = 'gdp';
let highlighted = '';
let selected;

const x = d3.scaleLinear().range([margin*2, width-margin]);
const y = d3.scaleLinear().range([height-margin, margin]);

const xBar = d3.scaleBand().range([margin*2, barWidth-margin]).padding(0.1);
const yBar = d3.scaleLinear().range([height-margin, margin])

const xAxis = scatterPlot.append('g').attr('transform', `translate(0, ${height-margin})`);
const yAxis = scatterPlot.append('g').attr('transform', `translate(${margin*2}, 0)`);

const xLineAxis = lineChart.append('g').attr('transform', `translate(0, ${height-margin})`);
const yLineAxis = lineChart.append('g').attr('transform', `translate(${margin*2}, 0)`);

const xBarAxis = barChart.append('g').attr('transform', `translate(0, ${height-margin})`);
const yBarAxis = barChart.append('g').attr('transform', `translate(${margin*2}, 0)`);

const colorScale = d3.scaleOrdinal().range(['#DD4949', '#39CDA1', '#FD710C', '#A14BE5']);
const radiusScale = d3.scaleSqrt().range([10, 30]);

loadData().then(data => {

    colorScale.domain(new Set(data.map(d=>d.region)).values());

    d3.select('#range').on('change', function(){ 
        year = d3.select(this).property('value');
        yearLable.html(year);
        updateScatterPlot();
        updateBar();
    });

    d3.select('#radius').on('change', function(){ 
        rParam = d3.select(this).property('value');
        updateScatterPlot();
    });

    d3.select('#x').on('change', function(){ 
        xParam = d3.select(this).property('value');
        updateScatterPlot();
    });

    d3.select('#y').on('change', function(){ 
        yParam = d3.select(this).property('value');
        updateScatterPlot();
    });

    d3.select('#param').on('change', function(){ 
        param = d3.select(this).property('value');
        updateBar();
    });
    
    function updateBar(){
        // get array of object region: mean value
        const barRegion = Array.from(d3.rollup(data, 
                                    v => d3.mean(v, d => d[param][year]), d => d["region"]),
                                    ([key, value]) => ({key, value}))
        
        // get keys (region)
        regionDomain = barRegion.map(k => k.key)
        xBar.domain(regionDomain);
        
        // get mean values
        meanDomain = barRegion.map(v => v.value)
        yBar.domain([0, d3.max(meanDomain)])
        
        // create or update rectangle of barchart
        const selection = barChart.selectAll('rect').data(barRegion); 
        const rectangle = selection.enter()
                                    .append('rect'); 
        selection.merge(rectangle)
                .attr('x',  d => xBar(d.key))
                .attr('y',  d => yBar(d.value))
                .attr('width', xBar.bandwidth())
                .attr("height", r => height - margin - yBar(r.value))
                .style('fill', r => colorScale(r.key));
        
        // draw x and y axis
        xBarAxis.call(d3.axisBottom(xBar))
        yBarAxis.call(d3.axisLeft(yBar))
        
        // set opacity by click on barchart
        selection.on("click", (event, d) => {
                    clickedRegion = d.key
                    selection.transition()
                            .style('opacity', d => d.key == clickedRegion ? 1 : 0.4);
                    scatterPlot.selectAll('circle').transition()
                            .style('opacity', d => d.region == clickedRegion ? 0.6 : 0);
                })
    }

    function updateScatterPlot(){

        // scale x coordinate
        const xValues = data.map(d => Number(d[xParam][year]));
        const xDomain = d3.extent(xValues); 
        x.domain(xDomain); 

        // scale y coordinate
        const yValues = data.map(d => Number(d[yParam][year])); 
        const yDomain = d3.extent(yValues);
        y.domain(yDomain);

        // set and scale circle radius
        const rValues = data.map(d => Number(d[rParam][year]));
        const rDomain = d3.extent(rValues);
        radiusScale.domain(rDomain)

        // match color and region
        const regionDomain = d3.map(data, d => d["region"]).keys()
        colorScale.domain(regionDomain)
        
        // create or update a circle
        const selection = scatterPlot.selectAll('circle').data(data); 
        const circles = selection.enter()
                                .append('circle'); 

        selection.merge(circles)
                .attr('r', d => radiusScale(Number(d[rParam][year])))
                .attr('cx', d => x(Number(d[xParam][year])))
                .attr('cy', d => y(Number(d[yParam][year])))
                .style('fill', d => colorScale(d["region"]));

        // draw x and y axis
        xAxis.call(d3.axisBottom(x))
        yAxis.call(d3.axisLeft(y))
    }   

    updateBar();
    updateScatterPlot();
});


async function loadData() {
    const data = { 
        'population': await d3.csv('data/population.csv'),
        'gdp': await d3.csv('data/gdp.csv'),
        'child-mortality': await d3.csv('data/cmu5.csv'),
        'life-expectancy': await d3.csv('data/life_expectancy.csv'),
        'fertility-rate': await d3.csv('data/fertility-rate.csv')
    };
    
    return data.population.map(d=>{
        const index = data.gdp.findIndex(item => item.geo == d.geo);
        return  {
            country: d.country,
            geo: d.geo,
            region: d.region,
            population: d,
            'gdp': data['gdp'][index],
            'child-mortality': data['child-mortality'][index],
            'life-expectancy': data['life-expectancy'][index],
            'fertility-rate': data['fertility-rate'][index]
        }
    })
}