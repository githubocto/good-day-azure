import fs from "fs"
import { createCanvas } from "canvas"
import { Chart } from "chart.js"
import * as d3 from "d3"
import * as vega from "vega"
import { FormResponse, FormResponseField } from "."
import { questions, questionMap } from "./questions"

export const generateTimelineForField = async (
  data: FormResponse[],
  field: FormResponseField,
  startOfWeek: Date,
  endOfWeek: Date
) => {
  const width = 1200
  const height = 350

  const workdayQualityQuestion = questionMap["workday_quality"]

  const question = questions.find((q) => q.titleWithEmoji === field)
  if (question === undefined) {
    console.log(`${field} not found`)
    return
  }

  const { optionsWithEmoji: options } = question

  const config = {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    width,
    height,
    background: "white",
    padding: 50,
    config: {
      title: {
        fontSize: 40,
        offset: 40,
      },
      axis: {
        labelFontSize: 19,
      },
    },

    title: {
      text: `${field.replace(/_/g, " ")} (week of ${d3.timeFormat("%B %-d, %Y")(
        startOfWeek
      )})`,
    },

    data: [
      {
        name: "table",
        values: data
          .map((d) => {
            const optionIndex = options.indexOf(d[field])
            if (optionIndex === -1) return undefined
            const dayOfWeek = d3.timeDay.count(startOfWeek, d.date)
            const quality = workdayQualityQuestion.optionsWithEmoji.indexOf(
              d[workdayQualityQuestion.titleWithEmoji]
            )

            return {
              ...d,
              dayOfWeek,
              prevDayOfWeek: dayOfWeek - 0.5,
              nextDayOfWeek: dayOfWeek + 0.5,
              optionIndex,
              quality: quality === -1 ? undefined : quality,
            }
          })
          .filter(Boolean),
      },
    ],

    scales: [
      {
        name: "x",
        type: "linear",
        range: "width",
        domain: { data: "table", field: "dayOfWeek" },
        domainMin: 0.5,
        domainMax: 5.5,
      },
      {
        name: "y",
        type: "linear",
        range: "height",
        domain: { data: "table", field: "option" },
        domainMin: 0,
        domainMax: options.length - 1,
      },
      {
        name: "optionConvert",
        type: "threshold",
        domain: d3.range(1, options.length + 1),
        range: options,
      },
      {
        name: "qualityConvert",
        type: "threshold",
        domain: d3.range(1, 6),
        range: workdayQualityQuestion.optionsWithEmoji,
      },
      {
        name: "daysOfWeek",
        type: "threshold",
        domain: d3.range(0, 7),
        range: [
          "Saturday",
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ],
      },
      {
        name: "color",
        type: "linear",
        domain: [0, 2, 4],
        range: [
          "rgba(248, 113, 113, 0.2)",
          "rgba(233, 233, 233, 0.2)",
          "rgba(12, 185, 129, 0.2)",
        ],
      },
    ],

    axes: [
      {
        orient: "left",
        scale: "y",
        titlePadding: 10,
        grid: true,
        labelPadding: 20,
        tickCount: options.length,
        encode: {
          labels: {
            update: {
              text: { scale: "optionConvert", signal: "datum.value" },
            },
          },
        },
      },
      {
        orient: "bottom",
        scale: "x",
        format: "d",
        tickCount: 5,
        labelPadding: 20,
        labelAlign: "center",
        encode: {
          labels: {
            update: {
              text: { scale: "daysOfWeek", signal: "datum.value" },
            },
          },
        },
      },
    ],

    marks: [
      ...data.map((d, i) => ({
        type: "rect",
        from: { data: "table" },
        encode: {
          enter: {
            x: { scale: "x", field: "prevDayOfWeek" },
            x2: { scale: "x", field: "nextDayOfWeek" },
            y: { value: 0 },
            y2: { signal: "height" },
            fill: { scale: "color", field: "quality" },
            opacity: { value: 0.2 },
          },
        },
      })),
      {
        type: "line",
        from: { data: "table" },
        encode: {
          enter: {
            interpolate: { value: "linear" },
            x: { scale: "x", field: "dayOfWeek" },
            y: { scale: "y", field: "optionIndex" },
            stroke: { value: "rgba(99, 102, 241, 1)" },
            strokeWidth: { value: 4 },
          },
        },
      },
      {
        type: "symbol",
        from: { data: "table" },
        encode: {
          enter: {
            x: { scale: "x", field: "dayOfWeek" },
            y: { scale: "y", field: "optionIndex" },
            size: { value: 370 },
            shape: { value: "circle" },
            fill: { value: "rgba(99, 102, 241, 1)" },
          },
        },
      },
    ],
    legends: [
      {
        stroke: "color",
        title: "Quality of day",
        titleFontSize: 20,
        titlePadding: 20,
        encode: {
          labels: {
            update: {
              fontSize: { value: 20 },
              text: { scale: "qualityConvert", signal: "datum.value" },
            },
          },
        },
      },
    ],
  }

  // @ts-ignore
  const view = new vega.View(vega.parse(config), { renderer: "canvas" })
  const canvas = await view
    .toCanvas()
    .then(function (canvas) {
      return canvas
    })
    .catch(function (err) {
      console.error(err)
    })

  // @ts-ignore
  let imageData = canvas.toDataURL("image/png")
  imageData = imageData.replace(/^data:image\/\w+;base64,/, "")

  return imageData
}

// const question = questions.find((q) => q.titleWithEmoji === field)
// if (question === undefined) {
//   console.log(`${field} not found`)
//   return
// }

// const { optionsWithEmoji: options } = question

export const generateAmountOfDayChart = async (
  data: FormResponse[],
  startOfWeek: Date,
  endOfWeek: Date
) => {
  const width = 900
  const height = 900

  const workdayQualityQuestion = questionMap["workday_quality"]
  const qualityOptions = workdayQualityQuestion.optionsWithEmoji

  const amountOfDayFields = questions.filter(
    ({ options }) => options[0] === "None of the day"
  )
  const options = amountOfDayFields[0].options
  const pointData = amountOfDayFields
    .map((question, fieldIndex) => {
      const points = data.map((d) => {
        const value = d[question.titleWithEmoji] as string
        const optionIndex = options.indexOf(value)
        const dayOfWeek = d3.timeDay.count(startOfWeek, d.date)
        if (optionIndex === -1) return
        return {
          fieldIndex: fieldIndex + 1,
          optionIndex,
          dayOfWeek,
        }
      })
      return points.filter(Boolean)
    })
    .reduce((a, b) => a.concat(b))

  const qualityData = data
    .map((d) => {
      const value = d[workdayQualityQuestion.titleWithEmoji]

      const optionIndex = qualityOptions.indexOf(value)
      const dayOfWeek = d3.timeDay.count(startOfWeek, d.date)
      if (optionIndex === -1) return
      return {
        fieldIndex: 0,
        optionIndex,
        dayOfWeek,
      }
    })
    .filter(Boolean)
  console.log(amountOfDayFields, pointData, "qualityData", qualityData)

  const config = {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    width,
    height,
    background: "white",
    padding: 50,
    config: {
      title: {
        fontSize: 60,
        offset: 40,
      },
      axis: {},
    },

    title: {
      text: `What did your good and not-so-good days look like?`,
    },

    data: [
      {
        name: "table",
        values: pointData,
      },
      {
        name: "quality",
        values: qualityData,
      },
    ],

    scales: [
      {
        name: "x",
        type: "band",
        range: "width",
        domain: [1, 2, 3, 4, 5],
        padding: 0.02,
      },
      {
        name: "y",
        type: "band",
        range: "height",
        domain: d3.range(0, amountOfDayFields.length + 1),
        padding: 0.23,
      },
      {
        name: "optionConvert",
        type: "threshold",
        domain: d3.range(1, amountOfDayFields.length + 2),
        range: [workdayQualityQuestion, ...amountOfDayFields].map((d) =>
          d.titleWithEmoji.replace("…", "")
        ),
      },
      {
        name: "amountConvert",
        type: "threshold",
        domain: d3.range(+1, options.length + 1),
        range: options,
      },
      {
        name: "daysOfWeek",
        type: "threshold",
        domain: d3.range(0, 7),
        range: ["Sat", "Sun", "M", "Tu", "W", "Th", "F"],
      },
      {
        name: "emojiMap",
        type: "threshold",
        domain: d3.range(0, emojiMap.length),
        range: emojiMap,
      },
      {
        name: "color",
        type: "linear",
        domain: [0, options.length - 1],
        range: ["rgba(231, 231, 231, 1)", "rgba(63, 62, 194, 1)"],
        interpolate: "hcl",
      },
      {
        name: "qualityColor",
        type: "linear",
        domain: [0, (qualityOptions.length - 1) / 2, qualityOptions.length - 1],
        // range: ['rgba(231, 231, 231, 1)', 'rgba(205, 123, 46, 1)'],
        range: [
          "rgb(75, 85, 99)",
          "rgba(231, 231, 231, 1)",
          "rgb(4, 150, 105)",
        ],
        interpolate: "hcl",
      },
    ],

    axes: [
      {
        orient: "left",
        scale: "y",
        titlePadding: 10,
        grid: false,
        labelPadding: 20,
        tickCount: amountOfDayFields.length,
        domainWidth: 0,
        domainOpacity: 0,
        labelFontSize: 31,
        labelLimit: 600,
        tickWidth: 0,
        // tickWidth: 500,
        encode: {
          labels: {
            update: {
              text: { scale: "optionConvert", signal: "datum.value" },
            },
          },
        },
      },
      {
        orient: "top",
        scale: "x",
        format: "d",
        tickCount: 5,
        domainWidth: 0,
        domainOpacity: 0,
        tickWidth: 0,
        labelFontSize: 30,
        labelLineHeight: 1,
        labelOffset: 0,
        labelPadding: 0,
        labelAlign: "center",
        encode: {
          labels: {
            update: {
              text: { scale: "daysOfWeek", signal: "datum.value" },
            },
          },
        },
      },
    ],

    marks: [
      {
        type: "rect",
        from: { data: "table" },
        encode: {
          enter: {
            x: { scale: "x", field: "dayOfWeek" },
            width: { scale: "x", band: 1 },
            y: { scale: "y", field: "fieldIndex" },
            height: { scale: "y", band: 1 },
            fill: { scale: "color", field: "optionIndex" },
            // fill: { value: "red" },
          },
        },
      },
      {
        type: "image",
        from: { data: "quality" },
        encode: {
          enter: {
            x: { scale: "x", field: "dayOfWeek" },
            width: { scale: "x", band: 1 },
            // y: { value: 0 },
            y: { scale: "y", value: 0 },
            height: { scale: "y", band: 1 },
            url: {
              scale: "emojiMap",
              field: "optionIndex",
            },
            // fill: { scale: 'qualityColor', field: 'optionIndex' }
            // fill: { value: "red" },
          },
        },
      },
    ],
    legends: [
      {
        type: "symbol",
        fill: "color",
        title: "Amount of day",
        titleFontSize: 40,
        titlePadding: 20,
        rowPadding: 10,
        symbolSize: 360,
        symbolType: "square",
        titleLimit: 500,
        labelLimit: 500,
        padding: 60,
        orient: "none",
        legendX: width,
        legendY: 0,
        encode: {
          labels: {
            update: {
              fontSize: { value: 30 },
              text: { scale: "amountConvert", signal: "datum.value" },
            },
          },
        },
      },
    ],
  }

  // @ts-ignore
  const view = new vega.View(vega.parse(config), { renderer: "canvas" })
  const canvas = await view
    .toCanvas()
    .then(function (canvas) {
      return canvas
    })
    .catch(function (err) {
      console.error(err)
    })

  // @ts-ignore
  let imageData = canvas.toDataURL("image/png")
  imageData = imageData.replace(/^data:image\/\w+;base64,/, "")

  return imageData
}

const emojiMap = [
  `data:image/png;base64,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`,
  `data:image/png;base64,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`,
  `data:image/png;base64,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`,
  `data:image/png;base64,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`,
  `data:image/png;base64,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`,
]

export const generateTimeOfDayChart = async (
  data: FormResponse[],
  startOfWeek: Date,
  endOfWeek: Date
) => {
  const width = 1100
  const height = 700

  const mostProductiveQuestion = questionMap["most_productive"]
  const leastProductiveQuestion = questionMap["least_productive"]
  const options = leastProductiveQuestion.optionsWithEmoji

  const productivityData = data
    .map((d) => {
      const dayOfWeek = d3.timeDay.count(startOfWeek, d.date)
      const dayOfWeekString = ["Sun", "M", "Tu", "W", "Th", "F", "Sat"][
        dayOfWeek
      ]
      const mostProductiveTime = d[mostProductiveQuestion.titleWithEmoji]
      const mostProductiveIndex = options.indexOf(mostProductiveTime)
      const leastProductiveTime = d[leastProductiveQuestion.titleWithEmoji]
      const leastProductiveIndex = options.indexOf(leastProductiveTime)

      return [
        leastProductiveIndex != -1 && {
          dayOfWeek,
          dayOfWeekString,
          type: "least",
          optionIndex: leastProductiveIndex,
        },
        mostProductiveIndex != -1 && {
          dayOfWeek,
          dayOfWeekString,
          type: "most",
          optionIndex: mostProductiveIndex,
        },
      ]
    })
    .reduce((a, b) => a.concat(b))
    .filter(Boolean)
  let runningXs = {}
  const mostData = productivityData
    .filter(({ type }) => type === "most")
    .map((d) => {
      const columnId = [d.optionIndex, "most"].join("--")
      if (!runningXs[columnId]) runningXs[columnId] = 0
      const columnIndex = runningXs[columnId]
      runningXs[columnId]++
      return {
        ...d,
        columnIndex,
      }
    })
  runningXs = {}
  const leastData = productivityData
    .filter(({ type }) => type === "least")
    .map((d) => {
      const columnId = [d.optionIndex, "least"].join("--")
      if (!runningXs[columnId]) runningXs[columnId] = 0
      const columnIndex = runningXs[columnId]
      runningXs[columnId]++
      return {
        ...d,
        columnIndex,
      }
    })

  const config = {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    width,
    height,
    background: "white",
    padding: 50,
    config: {
      title: {
        fontSize: 60,
        offset: 40,
      },
    },

    title: {
      text: `What time of the day are you most productive?`,
    },

    data: [
      {
        name: "most",
        values: mostData,
      },
      {
        name: "least",
        values: leastData,
      },
    ],

    scales: [
      {
        name: "x",
        type: "band",
        range: [0, 300],
        domain: d3.range(
          0,
          d3.max([...leastData, ...mostData], (d) => d.columnIndex) + 1
        ),
        padding: 0.1,
      },
      {
        name: "x2",
        type: "band",
        range: [500, 800],
        domain: d3.range(
          0,
          d3.max([...leastData, ...mostData], (d) => d.columnIndex) + 1
        ),
        padding: 0.1,
      },
      {
        name: "y",
        type: "band",
        range: [80, height],
        domain: d3.range(0, options.length),
        padding: 0.1,
      },
      {
        name: "optionsConvert",
        type: "threshold",
        domain: d3.range(+1, options.length + 1),
        range: options,
      },
      {
        name: "color",
        type: "linear",
        domain: [0, options.length - 1],
        range: ["rgba(231, 231, 231, 1)", "rgba(63, 62, 194, 1)"],
        interpolate: "hcl",
      },
    ],

    axes: [
      {
        orient: "left",
        scale: "y",
        titlePadding: 10,
        grid: false,
        labelPadding: 20,
        tickCount: options.length,
        domainWidth: 0,
        domainOpacity: 0,
        labelFontSize: 31,
        labelLimit: 600,
        tickWidth: 0,
        encode: {
          labels: {
            update: {
              text: { scale: "optionsConvert", signal: "datum.value" },
            },
          },
        },
      },
    ],

    marks: [
      {
        type: "rect",
        from: { data: "least" },
        encode: {
          enter: {
            x: { scale: "x", field: "columnIndex" },
            width: { scale: "x", band: 1 },
            y: { scale: "y", field: "optionIndex" },
            height: { scale: "x", band: 1 },
            fill: { value: "#F59E0C" },
          },
        },
      },
      {
        type: "rect",
        from: { data: "most" },
        encode: {
          enter: {
            x: { scale: "x2", field: "columnIndex" },
            width: { scale: "x", band: 1 },
            y: { scale: "y", field: "optionIndex" },
            height: { scale: "x", band: 1 },
            fill: { value: "#6366F1" },
            cornerRadius: { value: 1000 },
          },
        },
      },
      {
        type: "text",
        from: { data: "least" },
        encode: {
          enter: {
            text: { field: "dayOfWeekString" },
            x: { scale: "x", field: "columnIndex" },
            dx: { scale: "x", band: 0.5 },
            y: { scale: "y", field: "optionIndex" },
            dy: { scale: "y", band: 0.5 },
            fill: { value: "#fff" },
            fontSize: { value: 40 },
            fontWeight: { value: 800 },
            align: { value: "center" },
            baseline: { value: "middle" },
          },
        },
      },
      {
        type: "text",
        from: { data: "most" },
        encode: {
          enter: {
            text: { field: "dayOfWeekString" },
            x: { scale: "x2", field: "columnIndex" },
            dx: { scale: "x2", band: 0.5 },
            y: { scale: "y", field: "optionIndex" },
            dy: { scale: "y", band: 0.5 },
            fill: { value: "#fff" },
            fontSize: { value: 40 },
            fontWeight: { value: 800 },
            align: { value: "center" },
            baseline: { value: "middle" },
          },
        },
      },
      {
        type: "text",
        encode: {
          enter: {
            text: { value: "Least productive" },
            x: { value: 0 },
            y: { value: 50 },
            fontSize: { value: 35 },
          },
        },
      },
      {
        type: "text",
        encode: {
          enter: {
            text: { value: "Most productive" },
            x: { scale: "x2", value: 0 },
            y: { value: 50 },
            fontSize: { value: 35 },
          },
        },
      },
    ],
  }

  // @ts-ignore
  const view = new vega.View(vega.parse(config), { renderer: "canvas" })
  const canvas = await view
    .toCanvas()
    .then(function (canvas) {
      return canvas
    })
    .catch(function (err) {
      console.error(err)
    })

  // @ts-ignore
  let imageData = canvas.toDataURL("image/png")
  imageData = imageData.replace(/^data:image\/\w+;base64,/, "")

  return imageData
}

const removeEmoji = (str: string) =>
  str.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
    ""
  )
