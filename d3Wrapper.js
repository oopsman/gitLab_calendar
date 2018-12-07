
import './dateFormat';
import './tooltip';
import { scaleLinear, scaleThreshold } from 'd3-scale';
import { select } from 'd3-selection';

const d3 = { select, scaleLinear, scaleThreshold };

const LOADING_HTML = `
  <div class="text-center">
    <i class="fa fa-spinner fa-spin user-calendar-activities-loading"></i>
  </div>
`;

function getDayName(date){
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
}

function getDayDifference(a,b){
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const date1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const date2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((date2 - date1) / millisecondsPerDay);
}

function getSystemDate(systemUtcOffsetSeconds) {
  const date = new Date();
  const localUtcOffsetMinutes = 0 - date.getTimezoneOffset();
  const systemUtcOffsetMinutes = systemUtcOffsetSeconds / 60;
  date.setMinutes(date.getMinutes() - localUtcOffsetMinutes + systemUtcOffsetMinutes);
  return date;
}

function formatTooltipText({ date, count }) {
  const dateObject = new Date(date);
  const dateDayName = getDayName(dateObject);
  const dateText = dateObject.format('mmm d, yyyy');

  let contribText = 'No contributions';
  if (count > 0) {
    contribText = `${count} 次提交`;
  }
  return `${contribText}<br />${dateDayName} ${dateText}`;
}

const initColorKey = () =>
  d3
    .scaleLinear()
    .range(['#e48bdc', '#61185f'])
    .domain([0, 3]);

class ActivityCalendar {
  constructor(container, timestamps, calendarActivitiesPath, utcOffset = 0, firstDayOfWeek = 0) {
    this.calendarActivitiesPath = calendarActivitiesPath;
    this.clickDay = this.clickDay.bind(this);
    this.currentSelectedDate = '';
    this.daySpace = 1;
    this.daySize = 12;
    this.daySizeWithSpace = this.daySize + this.daySpace * 2;
    this.monthNames = [
      '一月',
      '二月',
      '三月',
      '四月',
      '五月',
      '六月',
      '七月',
      '八月',
      '九月',
      '十月',
      '十一月',
      '十二月',
    ];
    this.months = [];
    this.firstDayOfWeek = firstDayOfWeek;

    // Loop through the timestamps to create a group of objects
    // The group of objects will be grouped based on the day of the week they are
    this.timestampsTmp = [];
    let group = 0;

    const today = getSystemDate(utcOffset);
    today.setHours(0, 0, 0, 0, 0);

    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    const days = getDayDifference(oneYearAgo, today);

    for (let i = 0; i <= days; i += 1) {
      const date = new Date(oneYearAgo);
      date.setDate(date.getDate() + i);

      const day = date.getDay();
      const count = timestamps[date.format('yyyy-mm-dd')] || 0;

      // Create a new group array if this is the first day of the week
      // or if is first object
      if ((day === this.firstDayOfWeek && i !== 0) || i === 0) {
        this.timestampsTmp.push([]);
        group += 1;
      }

      // Push to the inner array the values that will be used to render map
      const innerArray = this.timestampsTmp[group - 1];
      innerArray.push({ count, date, day });
    }

    // Init color functions
    this.colorKey = initColorKey();
    this.color = this.initColor();

    // Init the svg element
    this.svg = this.renderSvg(container, group);
    this.renderDays();
    this.renderMonths();
    this.renderDayTitles();
    this.renderKey();

    // Init tooltips
    $(`${container} .js-tooltip`).tooltip({ html: true });
  }

  // Add extra padding for the last month label if it is also the last column
  getExtraWidthPadding(group) {
    let extraWidthPadding = 0;
    const lastColMonth = this.timestampsTmp[group - 1][0].date.getMonth();
    const secondLastColMonth = this.timestampsTmp[group - 2][0].date.getMonth();

    if (lastColMonth !== secondLastColMonth) {
      extraWidthPadding = 6;
    }

    return extraWidthPadding;
  }

  renderSvg(container, group) {
    const width = (group + 1) * this.daySizeWithSpace + this.getExtraWidthPadding(group);
    return d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', 167)
      .attr('class', 'contrib-calendar');
  }

  dayYPos(day) {
    return this.daySizeWithSpace * ((day + 7 - this.firstDayOfWeek) % 7);
  }

  renderDays() {
    const _this = this;
    this.svg
      .selectAll('g')
      .data(this.timestampsTmp)
      .enter()
      .append('g')
      .attr('transform', (group, i) => {
        $.each(group, (a,stamp) => {
          if (a === 0 && stamp.day === 0) {
            const month = stamp.date.getMonth();
            const x = this.daySizeWithSpace * i + 1 + this.daySizeWithSpace;
            const lastMonth = _this.months[_this.months.length -1];
            if (
              lastMonth == null ||
              (month !== lastMonth.month && x - this.daySizeWithSpace !== lastMonth.x)
            ) {
              _this.months.push({ month, x });
            }
          }
        });
        return `translate(${this.daySizeWithSpace * i + 8 + this.daySizeWithSpace}, 18)`;
      })
      .selectAll('rect')
      .data(stamp => stamp)
      .enter()
      .append('rect')
      .attr('x', '0')
      .attr('y', stamp => this.dayYPos(stamp.day))
      .attr('width', this.daySize)
      .attr('height', this.daySize)
      .attr(
        'fill',
        stamp => (stamp.count !== 0 ? this.color(Math.min(stamp.count, 40)) : '#ebedf0'),
      )
      .attr('title', stamp => formatTooltipText(stamp))
      .attr('class', 'user-contrib-cell js-tooltip')
      .attr('data-container', 'body')
      .on('click', this.clickDay);
  }

  renderDayTitles() {
    const days = [
      {
        text: '周一',
        y: 29 + this.dayYPos(1),
      },
      {
        text: '周三',
        y: 29 + this.dayYPos(3),
      },
      {
        text: '周五',
        y: 29 + this.dayYPos(5),
      },
    ];
    this.svg
      .append('g')
      .selectAll('text')
      .data(days)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('x', 10)
      .attr('y', day => day.y)
      .text(day => day.text)
      .attr('class', 'user-contrib-text');
  }

  renderMonths() {
    this.svg
      .append('g')
      .attr('direction', 'ltr')
      .selectAll('text')
      .data(this.months)
      .enter()
      .append('text')
      .attr('x', date => date.x)
      .attr('y', 10)
      .attr('class', 'user-contrib-text')
      .text(date => this.monthNames[date.month]);
  }

  renderKey() {
    const keyValues = [
      '没有提交',
      '1-9 提交',
      '10-19 提交',
      '20-29 提交',
      '30+ 提交',
    ];
    const keyColors = [
      '#ebedf0',
      this.colorKey(0),
      this.colorKey(1),
      this.colorKey(2),
      this.colorKey(3),
    ];

    this.svg
      .append('g')
      .attr('transform', `translate(18, ${this.daySizeWithSpace * 8 + 18})`)
      .selectAll('rect')
      .data(keyColors)
      .enter()
      .append('rect')
      .attr('width', this.daySize)
      .attr('height', this.daySize)
      .attr('x', (color, i) => this.daySizeWithSpace * i)
      .attr('y', 0)
      .attr('fill', color => color)
      .attr('class', 'js-tooltip')
      .attr('title', (color, i) => keyValues[i])
      .attr('data-container', 'body');
  }

  initColor() {
    const colorRange = [
      '#ededed',
      this.colorKey(0),
      this.colorKey(1),
      this.colorKey(2),
      this.colorKey(3),
    ];
    return d3
      .scaleThreshold()
      .domain([0, 10, 20, 30])
      .range(colorRange);
  }

  clickDay(stamp) {
    if (this.currentSelectedDate !== stamp.date) {
      this.currentSelectedDate = stamp.date;

      const date = [
        this.currentSelectedDate.getFullYear(),
        this.currentSelectedDate.getMonth() + 1,
        this.currentSelectedDate.getDate(),
      ].join('-');

      $('.user-calendar-activities').html(LOADING_HTML);

      $.get(this.calendarActivitiesPath,{date:date})
        .done(function(data){
          $('.user-calendar-activities').html(data);
        })
        .fail(function(e){
          console.log('An error occurred while retrieving calendar activity');
        });
    } else {
      this.currentSelectedDate = '';
      $('.user-calendar-activities').html('');
    }
  }
}

export  {ActivityCalendar as ActivityCalendar}