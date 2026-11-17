package com.glasshome.launcher.ui

import android.app.Activity
import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProviderInfo
import android.content.Intent
import android.os.Bundle
import android.util.SizeF
import android.view.ViewGroup
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.graphics.drawable.toBitmap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDateTime

/** Owns the AppWidgetHost and the bind / configure flow for real Android widgets. */
class WidgetController(private val activity: Activity) {
    private val host = AppWidgetHost(activity.applicationContext, 0x4C41)
    private val awm = AppWidgetManager.getInstance(activity)

    private class Pending(val id: Int, val info: AppWidgetProviderInfo, val onAdded: (Int) -> Unit)
    private var pending: Pending? = null

    fun startListening() = runCatching { host.startListening() }
    fun stopListening() = runCatching { host.stopListening() }

    fun providers(): List<AppWidgetProviderInfo> = runCatching { awm.installedProviders }.getOrDefault(emptyList())
        .sortedWith(compareBy(String.CASE_INSENSITIVE_ORDER) { appLabel(it) })

    fun appLabel(info: AppWidgetProviderInfo): String = runCatching {
        val pm = activity.packageManager
        pm.getApplicationInfo(info.provider.packageName, 0).loadLabel(pm).toString()
    }.getOrDefault(info.provider.packageName)

    fun label(info: AppWidgetProviderInfo): String = runCatching { info.loadLabel(activity.packageManager) }.getOrNull() ?: "Widget"

    fun info(id: Int): AppWidgetProviderInfo? = runCatching { awm.getAppWidgetInfo(id) }.getOrNull()

    fun add(info: AppWidgetProviderInfo, onAdded: (Int) -> Unit) {
        val id = host.allocateAppWidgetId()
        pending = Pending(id, info, onAdded)
        val bound = runCatching { awm.bindAppWidgetIdIfAllowed(id, info.profile, info.provider, null) }.getOrDefault(false)
        if (bound) {
            configure()
        } else {
            val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_BIND)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_PROVIDER, info.provider)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_PROVIDER_PROFILE, info.profile)
            @Suppress("DEPRECATION")
            runCatching { activity.startActivityForResult(intent, REQ_BIND) }.onFailure { finish(false) }
        }
    }

    private fun configure() {
        val p = pending ?: return
        val optional = (p.info.widgetFeatures and AppWidgetProviderInfo.WIDGET_FEATURE_CONFIGURATION_OPTIONAL) != 0
        if (p.info.configure != null && !optional) {
            runCatching { host.startAppWidgetConfigureActivityForResult(activity, p.id, 0, REQ_CONFIG, null) }
                .onFailure { finish(true) }
        } else {
            finish(true)
        }
    }

    /** Returns true when the result belonged to the widget flow. */
    fun onActivityResult(requestCode: Int, resultCode: Int): Boolean {
        when (requestCode) {
            REQ_BIND -> if (resultCode == Activity.RESULT_OK) configure() else finish(false)
            REQ_CONFIG -> finish(resultCode == Activity.RESULT_OK)
            else -> return false
        }
        return true
    }

    private fun finish(ok: Boolean) {
        val p = pending ?: return
        pending = null
        if (ok) p.onAdded(p.id) else runCatching { host.deleteAppWidgetId(p.id) }
    }

    fun delete(id: Int) {
        runCatching { host.deleteAppWidgetId(id) }
    }

    fun createView(id: Int): AppWidgetHostView? {
        val info = info(id) ?: return null
        return runCatching { host.createView(activity, id, info) }.getOrNull()
    }

    /** Preferred height for a widget in the Today view. */
    fun heightDp(id: Int, density: Float): Float {
        val info = info(id) ?: return 160f
        val fromCells = if (info.targetCellHeight > 0) info.targetCellHeight * 92f else 0f
        return max(info.minHeight / density, fromCells).coerceIn(110f, 420f)
    }

    fun widthCells(id: Int, density: Float): Float {
        val info = info(id) ?: return 2f
        if (info.targetCellWidth > 0) return info.targetCellWidth.toFloat()
        return (info.minWidth / density / 90f).coerceIn(1f, 4f)
    }

    private fun max(a: Float, b: Float) = if (a > b) a else b

    companion object {
        const val REQ_BIND = 4101
        const val REQ_CONFIG = 4102
    }
}

const val W_CLOCK = "clock"
const val W_CALENDAR = "calendar"
const val W_BATTERY = "battery"

fun appWidgetId(spec: String): Int? = if (spec.startsWith("aw:")) spec.removePrefix("aw:").toIntOrNull() else null

@Composable
fun AndroidWidget(id: Int, controller: WidgetController, modifier: Modifier = Modifier) {
    val view = remember(id) { controller.createView(id) }
    val density = LocalDensity.current
    if (view == null) {
        GlassPanel(modifier, RoundedCornerShape(26.dp)) {
            Text("Widget unavailable", color = Color.White.copy(alpha = 0.7f), modifier = Modifier.align(Alignment.Center))
        }
        return
    }
    AndroidView(
        factory = {
            (view.parent as? ViewGroup)?.removeView(view)
            view
        },
        modifier = modifier
            .clip(RoundedCornerShape(26.dp))
            .onSizeChanged { s ->
                val w = s.width / density.density
                val h = s.height / density.density
                if (w > 0 && h > 0) runCatching { view.updateAppWidgetSize(Bundle(), listOf(SizeF(w, h))) }
            },
    )
}

/** One widget (built-in or Android) with jiggle + remove badge in edit mode. */
@Composable
fun WidgetSlot(
    spec: String,
    now: State<LocalDateTime>,
    controller: WidgetController,
    editMode: Boolean,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val rot = if (editMode) rememberJiggle(spec, 0.8f) else null
    Box(modifier.graphicsLayer { rotationZ = rot?.value ?: 0f }) {
        val fill = Modifier.fillMaxSize()
        when (spec) {
            W_CLOCK -> ClockWidget(now, fill)
            W_CALENDAR -> CalendarWidget(now, fill)
            W_BATTERY -> BatteryWidget(fill)
            else -> appWidgetId(spec)?.let { AndroidWidget(it, controller, fill) }
        }
        if (editMode) {
            Box(Modifier.matchParentSize().pointerInput(Unit) { detectTapGestures { } })
            Box(
                Modifier
                    .align(Alignment.TopStart)
                    .offset((-8).dp, (-8).dp)
                    .size(26.dp)
                    .clip(CircleShape)
                    .background(Color(0xE63A3A3C))
                    .clickable(onClick = onRemove),
                contentAlignment = Alignment.Center,
            ) { Box(Modifier.size(width = 12.dp, height = 2.dp).background(Color.White)) }
        }
    }
}

private class PickerEntry(val spec: String?, val info: AppWidgetProviderInfo?, val title: String, val subtitle: String)

/** iOS-style widget gallery: built-in glass widgets first, then every app widget on the device. */
@Composable
fun WidgetPicker(
    progress: () -> Float,
    controller: WidgetController,
    targetName: String,
    onPickBuiltin: (String) -> Unit,
    onPickAndroid: (AppWidgetProviderInfo) -> Unit,
    onDismiss: () -> Unit,
) {
    val density = LocalDensity.current
    val entries by produceState<List<PickerEntry>>(emptyList()) {
        value = withContext(Dispatchers.Default) {
            val builtins = listOf(
                PickerEntry(W_CLOCK, null, "Clock", "Glass Launcher"),
                PickerEntry(W_CALENDAR, null, "Calendar", "Glass Launcher"),
                PickerEntry(W_BATTERY, null, "Battery", "Glass Launcher"),
            )
            builtins + controller.providers().map { p ->
                val cw = if (p.targetCellWidth > 0) p.targetCellWidth else ((p.minWidth / density.density) / 90f).toInt().coerceIn(1, 4)
                val ch = if (p.targetCellHeight > 0) p.targetCellHeight else ((p.minHeight / density.density) / 90f).toInt().coerceIn(1, 4)
                PickerEntry(null, p, controller.label(p), "${controller.appLabel(p)} · $cw×$ch")
            }
        }
    }
    Box(
        Modifier
            .fillMaxSize()
            .graphicsLayer { alpha = progress().coerceIn(0f, 1f) }
            .background(Color.Black.copy(alpha = 0.3f))
            .pointerInput(Unit) { detectTapGestures { onDismiss() } },
        contentAlignment = Alignment.BottomCenter,
    ) {
        Column(
            Modifier
                .windowInsetsPadding(WindowInsets.systemBars)
                .padding(16.dp)
                .widthIn(max = 640.dp)
                .fillMaxWidth()
                .fillMaxHeight(0.82f)
                .graphicsLayer { translationY = (1f - progress()) * 480.dp.toPx() }
                .clip(RoundedCornerShape(32.dp))
                .background(Color(0xEE1C1C1E))
                .border(0.6.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(32.dp))
                .pointerInput(Unit) { detectTapGestures { } },
        ) {
            Row(Modifier.padding(start = 24.dp, end = 16.dp, top = 20.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Add Widget", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("to $targetName", color = Color.White.copy(alpha = 0.55f), fontSize = 13.sp)
                }
                Box(
                    Modifier.size(34.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.12f)).clickable(onClick = onDismiss),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Default.Close, "Close", tint = Color.White, modifier = Modifier.size(18.dp)) }
            }
            LazyColumn(Modifier.fillMaxWidth().weight(1f), contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)) {
                items(entries, key = { it.spec ?: (it.info!!.provider.flattenToShortString() + it.info.profile.hashCode()) }) { e ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .clickable {
                                if (e.spec != null) onPickBuiltin(e.spec) else onPickAndroid(e.info!!)
                            }
                            .background(Color.White.copy(alpha = 0.06f))
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        PreviewImage(e, 84.dp)
                        Column(Modifier.weight(1f)) {
                            Text(e.title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(e.subtitle, color = Color.White.copy(alpha = 0.55f), fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PreviewImage(e: PickerEntry, size: Dp) {
    val ctx = LocalContext.current
    val dpi = ctx.resources.displayMetrics.densityDpi
    Box(
        Modifier.size(size).clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = 0.08f)),
        contentAlignment = Alignment.Center,
    ) {
        val info = e.info
        if (info == null) {
            Text(
                when (e.spec) { W_CLOCK -> "9:41"; W_CALENDAR -> "17"; else -> "%" },
                color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Light,
            )
        } else {
            val img by produceState<ImageBitmap?>(null, info) {
                value = withContext(Dispatchers.IO) {
                    runCatching {
                        val d = info.loadPreviewImage(ctx, dpi) ?: info.loadIcon(ctx, dpi)
                        val w = d.intrinsicWidth.takeIf { it > 0 } ?: 256
                        val h = d.intrinsicHeight.takeIf { it > 0 } ?: 256
                        val scale = minOf(1f, 320f / maxOf(w, h))
                        d.toBitmap((w * scale).toInt().coerceAtLeast(1), (h * scale).toInt().coerceAtLeast(1)).asImageBitmap()
                    }.getOrNull()
                }
            }
            img?.let { Image(it, null, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize().padding(6.dp)) }
        }
    }
}
