import './dateFormat';
import './tooltip';
import {
  scaleLinear,
  scaleThreshold
} from 'd3-scale';
import {
  select
} from 'd3-selection';

const d3 = {
  select,
  scaleLinear,
  scaleThreshold
};

const LOADING_HTML = `
  <div class="text-center">
    <i class="fa fa-spinner fa-spin user-calendar-activities-loading"></i>
  </div>
`;

function getDayName(date) {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
}

function getDayDifference(a, b) {
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

function formatTooltipText({
  date,
  commitNum,
  releaseNum
}) {
  const dateObject = new Date(date);
  const dateDayName = getDayName(dateObject);
  const dateText = dateObject.format('mmm d, yyyy');

  let contribText = '无活跃度';
  if (commitNum > 0) {
    contribText = `活跃度 ${commitNum}`;
  }
  if (releaseNum > 0) {
    contribText += `<br />${releaseNum} 次上线`;
  }
  return `${contribText}<br />${dateDayName} ${dateText}`;
}

const initColorKey = () =>
  d3
  .scaleLinear()
  .range(['#e48bdc', '#61185f'])
  .domain([0, 3]);

class ActivityCalendar {
  constructor(panelName, container, timestamps, calendarActivitiesPath, utcOffset = 0, firstDayOfWeek = 0, year) {
    this.panelName = panelName;
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

    const nowYear = new Date(today);
    const thisYear = nowYear.getFullYear();
    nowYear.setMonth(0);
    nowYear.setDate(0);

    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    oneYearAgo.setMonth(0);
    oneYearAgo.setDate(0);

    const twoYearAgo = new Date(today);
    twoYearAgo.setFullYear(today.getFullYear() - 2);
    twoYearAgo.setMonth(0);
    twoYearAgo.setDate(0);

    //const diffDays = Math.floor((tomorrowYear.getTime() - today.getTime()) / (24 * 60* 60 * 1000));
    //const btwnYearDays = Math.floor((oneYearAgoCP.getTime() - twoYearAgo.getTime()) / (24 * 60* 60 * 1000)); 
    //const days = getDayDifference(oneYearAgo, today);

    const allDays = nowYear.getFullYear() / 4 == 0 ? "366" : "365";
    let baseYearAgo = nowYear;
    if (year == (thisYear - 2)) {
      baseYearAgo = twoYearAgo;
    } else if (year == (thisYear - 1)) {
      baseYearAgo = oneYearAgo;
    }

    for (let i = 0; i <= allDays; i += 1) {
      const date = new Date(baseYearAgo);
      date.setDate(date.getDate() + i);

      const day = date.getDay();
      let tmp = timestamps[date.format('yyyy-mm-dd')];
      const commitNum = tmp ? (tmp.commitNum || 0) : 0;
      const releaseNum = tmp ? (tmp.releaseNum || 0) : 0;
      // Create a new group array if this is the first day of the week
      // or if is first object
      if ((day === this.firstDayOfWeek && i !== 0) || i === 0) {
        this.timestampsTmp.push([]);
        group += 1;
      }

      // Push to the inner array the values that will be used to render map
      const innerArray = this.timestampsTmp[group - 1];
      innerArray.push({
        commitNum,
        releaseNum,
        date,
        day
      });
    }

    // Init color functions
    this.colorKey = initColorKey();
    this.color = this.initColor();
    this.teamColor = this.initTeamColor();

    // Init the svg element
    this.svg = this.renderSvg(container, group);
    this.renderDays();
    this.renderMonths();
    this.renderDayTitles();
    this.renderKey();

    // Init tooltips
    $(`${container} .js-tooltip`).tooltip({
      html: true
    });
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
      .attr('width', width + 16)
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
        $.each(group, (a, stamp) => {
          if (a === 0 && stamp.day === 0) {
            const month = stamp.date.getMonth();
            const x = this.daySizeWithSpace * i + 1 + this.daySizeWithSpace;
            const lastMonth = _this.months[_this.months.length - 1];
            if (
              lastMonth == null ||
              (month !== lastMonth.month && x - this.daySizeWithSpace !== lastMonth.x)
            ) {
              _this.months.push({
                month,
                x
              });
            }
          }
        });
        return `translate(${this.daySizeWithSpace * i + 12 + this.daySizeWithSpace}, 18)`;
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
        stamp => {
          if (!(stamp.releaseNum)) {
            stamp.releaseNum = 0
          }
          if (!(stamp.commitNum)) {
            stamp.commitNum = 0
          }
          if (this.panelName.indexOf("team") > -1) {
            return (stamp.commitNum + stamp.releaseNum !== 0 ? this.teamColor(Math.min(stamp.commitNum + stamp.releaseNum, 90)) : '#ebedf0')
          } else {
            return (stamp.commitNum + stamp.releaseNum !== 0 ? this.color(Math.min(stamp.commitNum + stamp.releaseNum, 30)) : '#ebedf0')
          }
        }
      )
      .attr('title', stamp => formatTooltipText(stamp))
      .attr('class', 'user-contrib-cell js-tooltip')
      .attr('data-container', 'body')
      .on('click', this.clickDay);
  }

  renderDayTitles() {
    const days = [{
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
      .attr('x', 13)
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
      '无活跃度',
      '1-9 活跃度',
      '10-19 活跃度',
      '20-29 活跃度',
      '30+ 活跃度'
    ];
    const teamKeyValues = [
      '无活跃度',
      '1-30 活跃度',
      '31-60 活跃度',
      '61-90 活跃度',
      '90+ 活跃度'
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
      .attr('transform', `translate(18, ${this.daySizeWithSpace * 8 + 12})`)
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
      .attr('title', (color, i) => {
        if (this.panelName.indexOf("team") > -1) {
          return teamKeyValues[i]
        } else {
          return keyValues[i]
        }
      })
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

  initTeamColor() {
    const colorRange = [
      '#ededed',
      this.colorKey(0),
      this.colorKey(1),
      this.colorKey(2),
      this.colorKey(3),
    ];
    return d3
      .scaleThreshold()
      .domain([0, 30, 60, 90])
      .range(colorRange);
  }

  clickDay(stamp) {
    let _this = this;
    if (this.currentSelectedDate !== stamp.date) {
      this.currentSelectedDate = stamp.date;

      const date = [
        this.currentSelectedDate.getFullYear(),
        this.currentSelectedDate.getMonth() + 1,
        this.currentSelectedDate.getDate(),
      ].join('-');


      $(`.${this.panelName}-calendar-activities`).html(LOADING_HTML);

      $.get(this.calendarActivitiesPath, {
          beginTime: new Date(date).getTime(),
          endTime: new Date(date).getTime() + (1000 * 60 * 60 * 24)
        })
        .done(function (data) {
          $(`.${_this.panelName}-calendar-activities`).html(data);
        })
        .fail(function (e) {
          console.log('An error occurred while retrieving calendar activity');
        });
    } else {
      this.currentSelectedDate = '';
      $(`.${_this.panelName}-calendar-activities`).html('');
    }
  }
}

export {
  ActivityCalendar as ActivityCalendar
}