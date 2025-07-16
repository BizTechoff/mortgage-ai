import { isBackend } from "remult"

export class DayOfWeek {
    static sunday = new DayOfWeek('ראשון', 0)
    static monday = new DayOfWeek('שני', 1)
    static tuesday = new DayOfWeek('שלישי', 2)
    static wednesday = new DayOfWeek('רביעי', 3)
    static thursday = new DayOfWeek('חמישי', 4)
    static friday = new DayOfWeek('שישי', 5)
    static saturday = new DayOfWeek('שבת', 6)
    constructor(public caption = '', public value = 0) { }
    static getValueOf(dow: DayOfWeek) {
        return dow.value
    }
    static getCaptionOf(dow: DayOfWeek) {
        return dow.caption
    }
}

export const weekDays = [
    DayOfWeek.sunday,
    DayOfWeek.monday,
    DayOfWeek.tuesday,
    DayOfWeek.wednesday,
    DayOfWeek.thursday,
    DayOfWeek.friday,
    DayOfWeek.saturday
]

export const OneSecond = 1 * 1000
export const OneMinute = 60 * OneSecond
export const OneHour = 60 * OneMinute
export const OneDay = 24 * OneHour


export const dayOfCreatingVisits = DayOfWeek.sunday
export const dayOfHomeVisits = DayOfWeek.thursday

export function firstDateOfWeek(date: Date) {
    for (let i = 0; i < 7; ++i) {
        let day = date.getDay()
        if (day === dayOfCreatingVisits.value) {
            break
        }
        date = resetDateTime(new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() - 1));
    }
    return date
}

export function lastDateOfWeek(date: Date) {
    date = firstDateOfWeek(date)
    return resetDateTime(new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 7 - 1));
}

export function firstDateOfWeekByHomeVisit(date: Date) {
    let day = date.getDay()
    if (day < dayOfHomeVisits.value) {
        date = resetDateTime(new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() - day));
    }
    return firstDateOfWeek(date)
}

export function firstDateOfMonth(date: Date) {
    return resetDateTime(new Date(
        date.getFullYear(),
        date.getMonth(),
        1));
}

export function lastDateOfMonth(date: Date) {
    let first = firstDateOfMonth(date)
    let next = resetDateTime(new Date(
        first.getFullYear(),
        first.getMonth() + 1,
        1));
    return resetDateTime(new Date(
        next.getFullYear(),
        next.getMonth(),
        next.getDate() - 1));
}

// פונקציה עזר להשוואת תאריכים ללא שעות (אם calculateStats משווה תאריכים שלמים)
export function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

export function dateFormat(date: Date, delimiter = '/') {
    let result = ''
    if (date) {
        let day = date.getDate()
        let month = date.getMonth() + 1
        let year = date.getFullYear()

        result += ('00' + day).slice(-2)
        result += delimiter
        result += ('00' + month).slice(-2)
        result += delimiter
        result += year
    }
    return result
}

export function timeFormat(date: Date, delimiterTime = ':') {
    let result = ''
    if (date) {
        let hour = date.getHours()
        let min = date.getMinutes()

        result += ('00' + hour).slice(-2)
        result += delimiterTime
        result += ('00' + min).slice(-2)
    }
    return result
}

export function dateShortFormat(date: Date, delimiter = '/') {
    let result = ''
    if (date) {
        let month = date.getMonth() + 1
        let year = date.getFullYear()

        result += year.toString().slice(2)
        result += month.toString()
    }
    return result

}

export function dateDbFormat(date: Date, delimiter = '-') {
    let result = ''
    if (date) {
        let day = date.getDate()
        let month = date.getMonth() + 1
        let year = date.getFullYear()

        result += year
        result += delimiter
        result += ('00' + month).slice(-2)
        result += delimiter
        result += ('00' + day).slice(-2)
    }
    return result

}

export function dateWithTimeFormatFull(date: Date, time = '00:00') {
    // if (isToday(date)){
    //     return 'היום בשעה' + ' ' + time
    // }
    return dateFormat(date) + ' ' + time
}

function isToday(date: Date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

// export function isNumberKey(evt: any) {
//   // //console.log('evt', evt)
//   var charCode = (evt.which) ? evt.which : evt.keyCode
//   return !(charCode > 31 && (charCode < 48 || charCode > 57));
// }

export function dateFormatFull(date: Date, delimiter = '/', delimiterTime = ':') {
    let result = ''
    if (date) {

        let day = date.getDate()
        let month = date.getMonth() + 1
        let year = date.getFullYear()

        result += ('00' + day).slice(-2)
        result += delimiter
        result += ('00' + month).slice(-2)
        result += delimiter
        result += year

        result += ' '

        let hour = date.getHours()
        let min = date.getMinutes()
        let sec = date.getSeconds()
        let mil = date.getMilliseconds()

        result += ('00' + hour).slice(-2)
        result += delimiterTime
        result += ('00' + min).slice(-2)
        result += delimiterTime
        result += ('00' + sec).slice(-2)
        result += '.'
        result += ('00' + mil).slice(-2)
    }
    return result
}

export function dateFormatFullShort(date: Date, delimiter = '/', delimiterTime = ':') {
    let result = ''
    if (date) {

        let day = date.getDate()
        let month = date.getMonth() + 1
        let year = date.getFullYear()

        result += ('00' + day).slice(-2)
        result += delimiter
        result += ('00' + month).slice(-2)
        result += delimiter
        result += year

        result += ' '

        let hour = date.getHours()
        let min = date.getMinutes()

        result += ('00' + hour).slice(-2)
        result += delimiterTime
        result += ('00' + min).slice(-2)
    }
    return result
}

export function calculateDiff(data1: Date, date2: Date) {
    let days = Math.floor((data1.getTime() - date2.getTime()) / 1000 / 60 / 60 / 24);
    return days;
}

export function dateEquals(date1: Date, date2: Date) {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
}

export function monthOfYear(data: Date) {
    return data.getMonth() + 1
}

export function weekOfYear(data: Date) {
    let startDate = new Date(data.getFullYear(), 0, 1);
    var days = calculateDiff(data, startDate)
    return Math.ceil(days / 7);
}

export function dayOfMonth(data: Date) {
    return data.getDate()
}


export function resetDateTime(date = new Date(), days = 0) {
    if (!date) {
        // console.log('resetDateTime date = NULL !! ')
        date = new Date()
    }
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + days,
        0,
        isBackend() ? date.getTimezoneOffset() * -1 : 0,
        0);
}


export function resetDateTimeToMonthBefore(date = new Date(), days = 0) {
    if (!date) {
        // console.log('resetDateTime date = NULL !! ')
        date = new Date()
    }
    return new Date(
        date.getFullYear(),
        date.getMonth() - 1,
        date.getDate() + days,
        0,
        isBackend() ? date.getTimezoneOffset() * -1 : 0,
        0);
}

export function dateDiff(d1: Date, d2: Date) {

    let timeDifference = Math.abs(d1.getTime() - d2.getTime());
    let differentDays = Math.ceil(timeDifference / (1000 * 3600 * 24));
    return differentDays
}

export function addDaysToDate(date: Date, days = 0) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
    // var result = new Date()
    // if (date) {
    //     result = date
    // }
    // if (days) {
    //     result.setDate(
    //         result.getDate() + days);
    // }
    // return result
}

export function getWeekNumber(d: Date) {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    var weekNo = Math.ceil((((+d - +yearStart) / 86400000) + 1) / 7);
    // Return array of year and week number
    return [d.getUTCFullYear(), weekNo];
}

export function reverseDate(date = '', delimiter = '/') {
    let result = date
    let split = date.split(delimiter)
    if (split.length === 3) {
        result = `${split[2]}${delimiter}${split[1]}${delimiter}${split[0]}`
    }
    return result
}
