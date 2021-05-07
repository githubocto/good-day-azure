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
    // description:
    //   "An annotated line chart of the population of Falkensee, Germany.",
    width,
    height,
    background: "white",
    padding: 50,
    config: {
      title: {
        fontSize: 40,
        offset: 60,
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
        values: data.map((d) => {
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
            quality,
          }
        }),
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
        domain: d3.range(0, options.length),
        range: options,
      },
      {
        name: "qualityConvert",
        type: "threshold",
        domain: d3.range(0, 4),
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

export const generateTimeOfDayChart = async (
  data: FormResponse[],
  startOfWeek: Date,
  endOfWeek: Date
) => {
  const width = 1200
  const height = 500

  const leastProductiveQuestion = questionMap["least_productive"]
  const mostProductiveQuestion = questionMap["most_productive"]
  const options = leastProductiveQuestion.optionsWithEmoji.reverse()

  const config = {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Least Productive",
          backgroundColor: "rgb(245, 158, 12)",
          borderWidth: 1,
          radius: 19,
          clip: { left: 0, top: false, right: 0, bottom: false },
          data: data.map((d) => {
            const dayOfWeek = d3.timeDay.count(startOfWeek, d.date)
            const leastProductiveIndex = options.indexOf(
              d[leastProductiveQuestion.titleWithEmoji]
            )
            return { x: dayOfWeek, y: leastProductiveIndex }
          }),
        },
        {
          label: "Most Productive",
          backgroundColor: "rgb(99, 102, 241)",
          borderWidth: 0,
          radius: 27,
          pointStyle: "triangle",
          clip: { left: false, top: false, right: false, bottom: false },
          data: data.map((d) => {
            const dayOfWeek = d3.timeDay.count(startOfWeek, d.date)
            const mostProductiveIndex = options.indexOf(
              d[mostProductiveQuestion.titleWithEmoji]
            )
            return { x: dayOfWeek, y: mostProductiveIndex }
          }),
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          padding: {
            bottom: 26,
          },
          font: {
            weight: 900,
            size: 26,
          },
          text: `Do you have a typical time of day that feels productive? (week of ${d3.timeFormat(
            "%B %-d, %Y"
          )(startOfWeek)})`,
        },
      },
      layout: {
        padding: { top: 30, right: 50, bottom: 30, left: 50 },
      },
      scales: {
        x: {
          min: 0.5,
          max: 5.5,
          ticks: {
            stepSize: 0.5,
            callback: (value, i) => {
              if (value !== Math.floor(value)) return ""
              return d3.timeFormat("%A")(d3.timeDay.offset(startOfWeek, value))
            },
          },
          gridLines: {
            stepSize: 1,
          },
        },
        y: {
          min: 0,
          max: options.length,
          ticks: {
            stepSize: 1,
            callback: (value) => options[value],
          },
        },
      },
    },
    plugins: [
      {
        beforeDraw: (chart) => {
          const ctx = chart.canvas.getContext("2d")
          ctx.fillStyle = "white"
          ctx.fillRect(0, 0, chart.width, chart.height)
        },
      },
    ],
  }

  const canvas = createCanvas(width, height)

  Chart.defaults.font = {
    family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
    style: "normal",
    size: 18,
    lineHeight: 1.2,
    weight: "500",
  }

  // @ts-ignore
  const chart = new Chart(canvas, config)

  let imageData = canvas.toDataURL("image/png")
  imageData = imageData.replace(/^data:image\/\w+;base64,/, "")

  // const filename = `/tmp/timeline-${index}.png`
  // await fs.writeFile(filename, imageData, { encoding: "base64" }, (e) => {
  //   // console.log(e);
  // })

  return imageData
}

const removeEmoji = (str: string) =>
  str.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
    ""
  )
