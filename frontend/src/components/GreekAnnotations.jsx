export const GreekAnnotations = {
  delta: {
    lines: [
      { y: 0, color: 'rgba(128, 128, 128, 0.3)', width: 1 },
      { y: 0.5, color: 'rgba(33, 150, 243, 0.3)', width: 1 },
      { y: -0.5, color: 'rgba(233, 30, 99, 0.3)', width: 1 }
    ],
    items: [
      { x: 100, text: "±0.5 delta point", position: 'top' },
      { x: 150, text: "Delta approaches ±1", position: 'bottom' }
    ]
  },
  gamma: {
    lines: [
      { y: 0, color: 'rgba(128, 128, 128, 0.3)', width: 1 }
    ],
    items: [
      { x: 100, text: "Peak gamma (highest sensitivity)", position: 'top' }
    ]
  },
  theta: {
    lines: [
      { y: 0, color: 'rgba(128, 128, 128, 0.3)', width: 1 }
    ],
    items: [
      { x: 100, text: "Maximum theta decay", position: 'bottom' }
    ]
  },
  vega: {
    lines: [
      { y: 0, color: 'rgba(128, 128, 128, 0.3)', width: 1 }
    ],
    items: [
      { x: 100, text: "Peak vega sensitivity", position: 'top' }
    ]
  }
};
