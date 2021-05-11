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
    padding: 90,
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
  const width = 800
  const height = 1500

  const workdayQualityQuestion = questionMap["workday_quality"]
  const meetingsQuestion = questionMap["meetings"]
  const meetingsOptions = workdayQualityQuestion.optionsWithEmoji
  const feelingsQuestion = questionMap["emotions"]

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
          fieldIndex: fieldIndex + 2,
          optionIndex,
          dayOfWeek,
        }
      })
      return points.filter(Boolean)
    })
    .reduce((a, b) => a.concat(b))

  const getOptionIndicesForField = (field) => {
    const question = questionMap[field]
    const options = question.optionsWithEmoji

    return data
      .map((d) => {
        const value = d[question.titleWithEmoji]

        const optionIndex = options.indexOf(value)
        const dayOfWeek = d3.timeDay.count(startOfWeek, d.date)
        if (optionIndex === -1) return
        return {
          fieldIndex: 0,
          optionIndex,
          dayOfWeek,
        }
      })
      .filter(Boolean)
  }
  const qualityData = getOptionIndicesForField("workday_quality")
  const meetingsData = getOptionIndicesForField("meetings")
  const feelingsData = getOptionIndicesForField("emotions")

  const config = {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    width,
    height,
    background: "white",
    padding: 90,
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
      {
        name: "meetings",
        values: meetingsData,
      },
      {
        name: "feelings",
        values: feelingsData,
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
        domain: d3.range(0, amountOfDayFields.length + 3),
        padding: 0.23,
      },
      {
        name: "optionConvert",
        type: "threshold",
        domain: d3.range(1, amountOfDayFields.length + 3),
        range: [
          workdayQualityQuestion,
          feelingsQuestion,
          ...amountOfDayFields,
          meetingsQuestion,
        ].map((d) => d.titleWithEmoji.replace("…", "")),
      },
      {
        name: "amountConvert",
        type: "threshold",
        domain: d3.range(+1, options.length + 1),
        range: options,
      },
      {
        name: "meetingsConvert",
        type: "threshold",
        domain: d3.range(+1, meetingsOptions.length + 1),
        range: options,
      },
      {
        name: "daysOfWeek",
        type: "threshold",
        domain: d3.range(0, 7),
        range: ["Sat", "Sun", "M", "T", "W", "T", "F"],
      },
      {
        name: "qualityEmojiMap",
        type: "threshold",
        domain: d3.range(0, qualityEmojiMap.length),
        range: qualityEmojiMap,
      },
      {
        name: "feelingsEmojiMap",
        type: "threshold",
        domain: d3.range(0, feelingsEmojiMap.length),
        range: feelingsEmojiMap,
      },
      {
        name: "color",
        type: "linear",
        domain: [0, options.length - 1],
        range: ["rgba(231, 231, 231, 1)", "rgba(63, 62, 194, 1)"],
        interpolate: "hcl",
      },
      {
        name: "meetingsColor",
        type: "linear",
        domain: [0, meetingsOptions.length - 1],
        range: ["rgba(231, 231, 231, 1)", "rgba(205, 123, 46, 1)"],
        // range: ['rgb(75, 85, 99)', 'rgba(231, 231, 231, 1)', 'rgb(4, 150, 105)'],
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
        tickCount: amountOfDayFields.length + 3,
        domainWidth: 0,
        domainOpacity: 0,
        labelFontSize: 31,
        labelLimit: 700,
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
        type: "rect",
        from: { data: "meetings" },
        encode: {
          enter: {
            x: { scale: "x", field: "dayOfWeek" },
            width: { scale: "x", band: 1 },
            y: { scale: "y", value: amountOfDayFields.length + 2 },
            height: { scale: "y", band: 1 },
            fill: { scale: "meetingsColor", field: "optionIndex" },
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
              scale: "qualityEmojiMap",
              field: "optionIndex",
            },
            // fill: { scale: 'qualityColor', field: 'optionIndex' }
            // fill: { value: "red" },
          },
        },
      },
      {
        type: "image",
        from: { data: "feelings" },
        encode: {
          enter: {
            x: { scale: "x", field: "dayOfWeek" },
            width: { scale: "x", band: 1 },
            y: { scale: "y", value: 1 },
            height: { scale: "y", band: 1 },
            url: {
              scale: "feelingsEmojiMap",
              field: "optionIndex",
            },
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
        legendY: 270,
        encode: {
          labels: {
            update: {
              fontSize: { value: 30 },
              text: { scale: "amountConvert", signal: "datum.value" },
            },
          },
        },
      },
      {
        type: "symbol",
        fill: "meetingsColor",
        title: "Meetings",
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
        legendY: 1162,
        encode: {
          labels: {
            update: {
              fontSize: { value: 30 },
              text: { scale: "meetingsConvert", signal: "datum.value" },
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

const qualityEmojiMap = [
  `data:image/png;base64,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`,
  `data:image/png;base64,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`,
  `data:image/png;base64,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`,
  `data:image/png;base64,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`,
  `data:image/png;base64,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`,
]
const feelingsEmojiMap = [
  `data:image/png;base64,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`,
  `data:image/png;base64,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`,
  `data:image/png;base64,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`,
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
  const width = 1000
  const height = 650

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

  let xScaleMax = d3.max([
    2,
    ...[...leastData, ...mostData].map((d) => d.columnIndex),
  ])
  let xScaleRange = d3.range(0, xScaleMax + 1)
  const boxWidth = 90
  const xScaleWidth = boxWidth * xScaleMax * 1.5
  const yScaleHeight = boxWidth * options.length

  const config = {
    $schema: "https://vega.github.io/schema/vega/v5.json",
    width,
    height,
    background: "white",
    padding: 90,
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
        range: [0, xScaleWidth],
        domain: xScaleRange,
        padding: 0.1,
      },
      {
        name: "x2",
        type: "band",
        range: [xScaleWidth * 1.3 + 50, xScaleWidth * 1.3 + 50 + xScaleWidth],
        domain: xScaleRange,
        padding: 0.1,
      },
      {
        name: "y",
        type: "band",
        range: [80, 80 + yScaleHeight],
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
        range: ["rgba(231, 231, 231, 1)", "#372FA3"],
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
