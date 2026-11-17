package com.glasshome.launcher.ui

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.text.format.DateFormat
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.min

private val WidgetShape = RoundedCornerShape(30.dp)
private val IosRed = Color(0xFFFF453A)
private val IosGreen = Color(0xFF30D158)

@Composable
private fun rememberBroadcast(filter: IntentFilter, read: (Context, Intent?) -> Unit) {
    val ctx = LocalContext.current
    DisposableEffect(Unit) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, i: Intent) = read(c, i)
        }
        val sticky = ContextCompat.registerReceiver(ctx, receiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        read(ctx, sticky)
        onDispose { runCatching { ctx.unregisterReceiver(receiver) } }
    }
}

@Composable
fun rememberNow(): State<LocalDateTime> {
    val state = remember { mutableStateOf(LocalDateTime.now()) }
    val filter = remember {
        IntentFilter().apply {
            addAction(Intent.ACTION_TIME_TICK)
            addAction(Intent.ACTION_TIME_CHANGED)
            addAction(Intent.ACTION_TIMEZONE_CHANGED)
            addAction(Intent.ACTION_SCREEN_ON)
        }
    }
    rememberBroadcast(filter) { _, _ -> state.value = LocalDateTime.now() }
    return state
}

@Composable
fun WidgetsRow(cols: Int, modifier: Modifier = Modifier) {
    val now = rememberNow()
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        ClockWidget(now, Modifier.weight(if (cols >= 7) 1.7f else 1.3f).fillMaxHeight())
        CalendarWidget(now, Modifier.weight(1f).fillMaxHeight())
        if (cols >= 6) BatteryWidget(Modifier.weight(1f).fillMaxHeight())
    }
}

@Composable
fun ClockWidget(now: State<LocalDateTime>, modifier: Modifier = Modifier) {
    val ctx = LocalContext.current
    GlassPanel(modifier, WidgetShape) {
        BoxWithConstraints(Modifier.fillMaxSize().padding(22.dp)) {
            val t = now.value
            val is24 = DateFormat.is24HourFormat(ctx)
            val time = t.format(DateTimeFormatter.ofPattern(if (is24) "HH:mm" else "h:mm"))
            val big = (min(maxHeight.value * 0.42f, maxWidth.value * 0.26f)).sp
            Column(Modifier.align(Alignment.BottomStart)) {
                Text(
                    t.format(DateTimeFormatter.ofPattern("EEEE", Locale.getDefault())).uppercase(),
                    color = IosRed, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp,
                )
                Text(time, color = Color.White, fontSize = big, fontWeight = FontWeight.Light, lineHeight = big)
                Text(
                    t.format(DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.getDefault())),
                    color = Color.White.copy(alpha = 0.8f), fontSize = 16.sp, fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

@Composable
fun CalendarWidget(now: State<LocalDateTime>, modifier: Modifier = Modifier) {
    GlassPanel(modifier, WidgetShape) {
        BoxWithConstraints(Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 14.dp)) {
            val date = now.value.toLocalDate()
            val first = date.withDayOfMonth(1)
            val lead = first.dayOfWeek.value % 7 // Sunday first
            val days = date.lengthOfMonth()
            val weeks = (lead + days + 6) / 7
            val cell = min(maxWidth.value / 7f, (maxHeight.value - 24f) / (weeks + 1f))
            val fs = (cell * 0.46f).coerceIn(9f, 16f).sp
            Column(Modifier.fillMaxSize()) {
                Text(
                    date.month.getDisplayName(TextStyle.FULL, Locale.getDefault()).uppercase(),
                    color = IosRed, fontSize = 13.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp,
                    modifier = Modifier.height(22.dp),
                )
                Row(Modifier.fillMaxWidth().weight(1f)) {
                    listOf("S", "M", "T", "W", "T", "F", "S").forEach {
                        Box(Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.Center) {
                            Text(it, color = Color.White.copy(alpha = 0.55f), fontSize = fs, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
                for (w in 0 until weeks) {
                    Row(Modifier.fillMaxWidth().weight(1f)) {
                        for (d in 0 until 7) {
                            val day = w * 7 + d - lead + 1
                            Box(Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.Center) {
                                if (day in 1..days) {
                                    val today = day == date.dayOfMonth
                                    Box(
                                        Modifier
                                            .fillMaxHeight(0.92f)
                                            .aspectRatio(1f)
                                            .clip(CircleShape)
                                            .background(if (today) IosRed else Color.Transparent),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text(
                                            "$day",
                                            color = Color.White,
                                            fontSize = fs,
                                            fontWeight = if (today) FontWeight.Bold else FontWeight.Medium,
                                            textAlign = TextAlign.Center,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BatteryWidget(modifier: Modifier = Modifier) {
    val level = remember { mutableStateOf(-1) }
    val charging = remember { mutableStateOf(false) }
    val filter = remember { IntentFilter(Intent.ACTION_BATTERY_CHANGED) }
    rememberBroadcast(filter) { _, i ->
        if (i != null) {
            val l = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
            val s = i.getIntExtra(BatteryManager.EXTRA_SCALE, 100).coerceAtLeast(1)
            if (l >= 0) level.value = l * 100 / s
            val st = i.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
            charging.value = st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL
        }
    }
    GlassPanel(modifier, WidgetShape) {
        BoxWithConstraints(Modifier.fillMaxSize().padding(18.dp), contentAlignment = Alignment.Center) {
            val ring = min(maxWidth.value, maxHeight.value - 26f).coerceAtLeast(40f)
            val pct = level.value.coerceAtLeast(0)
            val color = when {
                charging.value -> IosGreen
                pct <= 20 -> IosRed
                else -> IosGreen
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.height(ring.dp).aspectRatio(1f), contentAlignment = Alignment.Center) {
                    Canvas(Modifier.fillMaxSize()) {
                        val stroke = size.minDimension * 0.1f
                        val inset = stroke / 2
                        val arcSize = Size(size.width - stroke, size.height - stroke)
                        drawArc(Color.White.copy(alpha = 0.18f), 0f, 360f, false, Offset(inset, inset), arcSize, style = Stroke(stroke))
                        drawArc(color, -90f, 360f * pct / 100f, false, Offset(inset, inset), arcSize, style = Stroke(stroke, cap = StrokeCap.Round))
                    }
                    Text(
                        if (level.value < 0) "–" else "$pct%",
                        color = Color.White,
                        fontSize = (ring * 0.22f).sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    if (charging.value) "Charging" else "Battery",
                    color = Color.White.copy(alpha = 0.75f), fontSize = 13.sp, fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}
