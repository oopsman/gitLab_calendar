
import ActivityCalendar from "./d3Wrapper"

const CALENDAR_TEMPLATE = `
    <div class="clearfix calendar">
        <div class="js-contrib-calendar"></div>
    </div>
    `;
const $calendarWrap = $('.user-calendar');
const calendarPath = $calendarWrap.data('calendarPath');
const calendarActivitiesPath = $calendarWrap.data('calendarActivitiesPath');
const utcOffset = $calendarWrap.data('utcOffset');
let utcFormatted = 'UTC';
if (utcOffset !== 0) {
    utcFormatted = `UTC${utcOffset > 0 ? '+' : ''}${(utcOffset / 3600)}`;
}

$.get(calendarPath)
    .done(function (data) {
        $calendarWrap.html(CALENDAR_TEMPLATE);
        new ActivityCalendar('.js-contrib-calendar', data, calendarActivitiesPath, utcOffset);
    })
    .fail(function (e) {
        console.log('There was an error loading users activity calendar.');
    });
