import fs from "fs"
import { createCanvas } from "canvas"
import { Chart } from "chart.js"
import * as d3 from "d3"
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

  const question = questions.find((q) => q.titleWithEmoji === field)
  if (question === undefined) {
    console.log(`${field} not found`)
    return
  }

  const { optionsWithEmoji: options } = question

  const config = {
    type: "line",
    data: {
      datasets: [
        {
          label: field,
          borderColor: "rgb(99, 102, 241)",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          pointBackgroundColor: "rgba(99, 102, 241, 1)",
          pointRadius: 5,
          spanGaps: true,
          data: data.map((d) => {
            const optionIndex = options.indexOf(d[field])
            if (optionIndex === -1) return undefined
            const dayOfWeek = d3.timeDay.count(startOfWeek, d.date)
            return { x: dayOfWeek, y: optionIndex }
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
          },
          text: `${field.replace(/_/g, " ")} (week of ${d3.timeFormat(
            "%B %-d, %Y"
          )(startOfWeek)})`,
        },
        legend: {
          display: false,
        },
      },
      layout: {
        padding: { top: 30, right: 50, bottom: 30, left: 50 },
      },
      scales: {
        x: {
          type: "linear",
          min: 1,
          max: 5,
          ticks: {
            maxTicksLimit: 5,
            callback: (value) =>
              d3.timeFormat("%A")(d3.timeDay.offset(startOfWeek, value)),
          },
        },
        y: {
          min: 0,
          max: options.length,
          stepSize: 1,
          ticks: {
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

export const generateTimeOfDayChart = async (
  data: FormResponse[],
  startOfWeek: Date,
  endOfWeek: Date
) => {
  const width = 1200
  const height = 500

  const config = {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Least Productive",
          backgroundColor: "rgb(239, 68, 68)",
          borderWidth: 1,
          radius: 19,
          clip: { left: false, top: false, right: false, bottom: false },
          data: data.map((d) => {
            const dayOfWeek = d3.timeDay.count(startOfWeek, d.date)
            const leastProductiveQuestion = questionMap["least_productive"]
            const leastProductiveIndex = leastProductiveQuestion.optionsWithEmoji.indexOf(
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
            const mostProductiveQuestion = questionMap["most_productive"]
            const mostProductiveIndex = mostProductiveQuestion.optionsWithEmoji.indexOf(
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
          min: 1,
          max: 5,
          ticks: {
            maxTicksLimit: 5,
            callback: (value) =>
              d3.timeFormat("%A")(d3.timeDay.offset(startOfWeek, value)),
          },
        },
        y: {
          min: 0,
          max: questionMap["least_productive"].optionsWithEmoji.length,
          stepSize: 1,
          ticks: {
            callback: (value) =>
              questionMap["least_productive"].optionsWithEmoji[value],
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
