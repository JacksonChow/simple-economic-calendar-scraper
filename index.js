const fs = require('fs');
const https = require('https')
var myft = require('./myFunctions.js');
var parse = require('node-html-parser').parse

var today = new Date()

try {
    var record = fs.readFileSync('record.json', 'utf-8')
    record = JSON.parse(record)
    var recordDate = new myft.MyDate(record.year, record.month)
} catch {
    var record = { year: 2014, month: 1 }
    var recordDate = new myft.MyDate(record.year, record.monnth)
    fs.writeFileSync('record.json', JSON.stringify(record))
}

datafile = 'data.txt'

try {
    fs.readFileSync(datafile)
} catch {
    fs.writeFileSync(datafile, '')
}


const options = {
    hostname: 'tradingeconomics.com',
    path: '/calendar',
    port: 443,
    method: 'GET',
    headers: {
        'User-Agent': 'nodejs https request'
    },
}

function getCookie(options) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            console.log(`getCookie function statusCode: ${res.statusCode}`)
            resolve(res.headers['set-cookie'])
        })

        req.on('error', error => {
            reject(error)
        })
        req.end()
    })
}


function getHTML(options) {
    return new Promise((resolve, reject) => {
        var html = ''
        const req = https.request(options, res => {
            console.log(`getHTML function statusCode: ${res.statusCode}`)
            res.on('data', d => {
                html += d
            })
            res.on('end', () => {
                console.log('getHTML function done!')
                resolve(html)
            })
        })
        req.on('error', error => {
            reject(error)
        })
        req.end()
    })
}

function getData(html) {
    var doc = parse(html)

    var table = doc.getElementById('calendar')
    var tempRows = table.querySelectorAll('tr')
    var rows = []

    for (let i = 0; i < tempRows.length; i = i + 2) {
        rows.push(tempRows[i])
    }


    var datenow = rows[0].querySelectorAll('th')[0].innerText
    datenow = datenow.replace(/\r?\n|\r/g, "");
    datenow = myft.split(datenow, [' '])

    var data = []
    for (let i = 1; i < rows.length; i++) {
        if (rows[i].parentNode.classNames == 'table-header') {
            datenow = rows[i].querySelectorAll('th', 'td')[0].innerText
            datenow = datenow.replace(/\r?\n|\r/g, "");
            datenow = myft.split(datenow, [' '])
        } else {
            var time = rows[i].querySelectorAll('td')[0].innerText
            time = time.replace(/\r?\n|\r/g, "");
            time = myft.split(time, [' ', ':'])
            if (time.length != 0) {
                time[0] = parseInt(time[0])
                time[1] = parseInt(time[1])
                if (time[2] == 'AM' && time[0] == 12) { time[0] = 0 }
                if (time[2] == 'PM' && time[0] != 12) { time[0] += 12 }
                time = new myft.MyDate(datenow[3], datenow[1], parseInt(datenow[2]), time[0], time[1])
            } else {
                time = 'undefined'
            }


            var country = rows[i].querySelectorAll('td')[1].innerText
            country = country.replace(/\r?\n|\r/g, "");
            country = myft.split(country, [' ', ':'])
            if (country.length == 0) { country = 'undefined' } else { country = country[0] }

            var info = rows[i].querySelectorAll('td')[4].innerText
            info = info.replace(/\r?\n|\r/g, "");
            info = myft.split(info, [' ', ':'])
            info = info.join(' ')

            var actual = rows[i].querySelectorAll('td')[5].innerText
            actual = actual.replace(/\r?\n|\r/g, "");
            actual = myft.split(actual, [' ', ':'])
            if (actual.length == 0) { actual = 'undefined' } else { actual = actual[0] }

            var previous = rows[i].querySelectorAll('td')[6].innerText
            previous = previous.replace(/\r?\n|\r/g, "");
            previous = myft.split(previous, [' ', ':'])
            if (previous.length == 0) { previous = 'undefined' } else { previous = previous[0] }

            var consensus = rows[i].querySelectorAll('td')[7].innerText
            consensus = consensus.replace(/\r?\n|\r/g, "");
            consensus = myft.split(consensus, [' ', ':'])
            if (consensus.length == 0) { consensus = 'undefined' } else { consensus = consensus[0] }

            var forecast = rows[i].querySelectorAll('td')[8].innerText
            forecast = forecast.replace(/\r?\n|\r/g, "");
            forecast = myft.split(forecast, [' ', ':'])
            if (forecast.length == 0) { forecast = 'undefined' } else { forecast = forecast[0] }


            var str = [time.toString(), country, info, actual, previous, consensus, forecast]
            str = str.join(',')
            data.push(str)
        }
    }
    return data
}




(async () => {
    var cookie = await getCookie(options)

    while (record.year != today.getFullYear() || record.month < today.getMonth() + 1) {
        var tempcookie = JSON.parse(JSON.stringify(cookie));

        var startdate = new myft.MyDate(record.year, record.month)
        var enddate = new myft.MyDate(record.year, record.month)
        enddate.addTime(1)
        enddate.addTime(0, -1)

        tempcookie[0] += '; cal-custom-range=' + startdate.toString() + '|' + enddate.toString()
        options['headers']['Cookie'] = tempcookie
        var html = await getHTML(options)
        var data = getData(html)
        data = data.join('\n')
        fs.appendFileSync(datafile, data)
        console.log('Data done!!! ' + recordDate.getYear() + ',' + recordDate.getMonth() )
        recordDate.addTime(1)
        record.year = recordDate.getYear()
        record.month = recordDate.getMonth()
        fs.writeFileSync('record.json', JSON.stringify(record))
    }
    console.log('its all done')
    // var doc = parser.parseFromString(html, 'text/xml')

    // var asd = doc.getElementById('calendar')

})();
