function generateNotify(allData) {
  const {
    bullish,
    bullish_plus,
    bearish,
    bearish_plus,
    bullish_exit,
    bearish_exit,
    trand_strength,
    take_profit,
    stop_loss,
    bar_color_value,
    trend_tracer,
    trend_catcher,
    smart_trail,
    smart_trail_extremity,
    rz_r3_band,
    rz_r2_band,
    rz_r1_band,
    rz_s1_band,
    rz_s2_band,
    rz_s3_band,
  } = allData;

  message = "";
  if (bullish !== "0") {
    message += `<b>Buy Signal Occered. ${bullish}</b> \n`;
  }

  if (bullish_plus !== "0") {
    message += `<b>Strong Buy Signal Occered. ${bullish_plus}</b> \n`;
  }

  if (bearish !== "0") {
    message += `<b>Sell Signal Occered. ${bearish}</b> \n`;
  }

  if (bearish_plus !== "0") {
    message += `<b>Strong Sell Signal Occered. ${bearish_plus}</b> \n`;
  }

  if (bearish_exit !== "null") {
    message += `<b>Sell Exit Signal Occered. ${bearish_exit}</b> \n`;
  }

  if (bullish_exit !== "null") {
    message += `<b>Buy Exit Signal Occered. ${bearish_exit}</b> \n`;
  }

  message += `Trand Strength is :<code> ${(+trand_strength).toFixed(
    2
  )}%</code> \n`;
  message += `Bar Color Is ${
    +bar_color_value < 0 ? "RED" : +bar_color_value > 0 ? "GREEN" : "VIOLET"
  } \n`;
  message += `Dynamic Profit taking price should ${(+take_profit).toFixed(
    2
  )} \n`;
  message += `Dynamic Stop Lose price should <code>${(+stop_loss).toFixed(
    2
  )}</code> \n`;
  message += `Trand Tracker IS <code>${(+trend_tracer).toFixed(2)}</code> \n`;
  message += `Trand Catcher IS<code> ${(+trend_catcher).toFixed(2)}</code> \n`;
  message += `Smart Trail IS <code>${(+smart_trail).toFixed(2)}</code> \n`;
  message += `Smart Trail Extremity IS <code>${(+smart_trail_extremity).toFixed(
    2
  )}</code> \n`;
  message += `Rz r3 band IS <code>${(+rz_r3_band).toFixed(2)}</code> \n`;
  message += `Rz r2 band IS <code>${(+rz_r2_band).toFixed(2)}</code> \n`;
  message += `Rz r1 band IS <code>${(+rz_r1_band).toFixed(2)}</code> \n`;
  message += `Rz s1 band IS <code>${(+rz_s1_band).toFixed(2)}</code> \n`;
  message += `Rz s2 band IS <code>${(+rz_s2_band).toFixed(2)}</code> \n`;
  message += `Rz s3 band IS <code>${(+rz_s3_band).toFixed(2)}</code> \n`;
  return message;
}

module.exports = { generateNotify };
