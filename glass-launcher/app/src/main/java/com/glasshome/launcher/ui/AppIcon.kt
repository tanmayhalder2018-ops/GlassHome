package com.glasshome.launcher.ui

import android.app.Activity
import android.app.ActivityOptions
import android.app.SearchManager
import android.content.Context
import android.content.Intent
import android.content.pm.LauncherApps
import android.net.Uri
import android.provider.Settings
import android.widget.Toast
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.glasshome.launcher.data.AppInfo

val LabelStyle = TextStyle(
    color = Color.White,
    fontSize = 12.sp,
    textAlign = TextAlign.Center,
    shadow = Shadow(Color.Black.copy(alpha = 0.45f), Offset(0f, 1f), 6f),
)

@Composable
internal fun rememberJiggle(seed: String, amount: Float = 2.2f): State<Float> {
    val t = rememberInfiniteTransition(label = "jiggle")
    val dur = 115 + (seed.hashCode() and 0x7FFFFFFF) % 40
    return t.animateFloat(
        initialValue = -amount,
        targetValue = amount,
        animationSpec = infiniteRepeatable(tween(dur, easing = LinearEasing), RepeatMode.Reverse),
        label = "rot",
    )
}

private val NoRotation = mutableStateOf(0f)

/**
 * iPhone-style unlock: while [progress] goes 0 -> 1, every icon flies in from further out
 * (the further from the centre, the later it lands) and fades in.
 */
class UnlockFx(val progress: () -> Float, val cx: Float, val cy: Float, val maxDist: Float)

val LocalUnlockFx = staticCompositionLocalOf<UnlockFx?> { null }

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun AppIcon(
    app: AppInfo,
    iconSize: Dp,
    showLabel: Boolean,
    jiggle: Boolean,
    onClick: (Rect) -> Unit,
    onLongClick: (Rect) -> Unit,
    modifier: Modifier = Modifier,
    onRemove: (() -> Unit)? = null,
    labelWidth: Dp = Dp.Unspecified,
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        if (pressed) 0.86f else 1f,
        spring(dampingRatio = 0.5f, stiffness = 650f),
        label = "press",
    )
    val bounds = remember { arrayOf(Rect.Zero) }
    val restCenter = remember { arrayOf(Offset.Unspecified) }
    val fx = LocalUnlockFx.current
    val haptic = LocalHapticFeedback.current
    val rotation = if (jiggle) rememberJiggle(app.key) else NoRotation

    Column(
        modifier
            .graphicsLayer {
                if (fx == null) return@graphicsLayer
                val u = fx.progress()
                val c = restCenter[0]
                if (u >= 1f || c == Offset.Unspecified) return@graphicsLayer
                val dx = c.x - fx.cx
                val dy = c.y - fx.cy
                val d = (kotlin.math.sqrt(dx * dx + dy * dy) / fx.maxDist).coerceIn(0f, 1f)
                val local = ((u - d * 0.28f) / 0.72f).coerceIn(0f, 1f)
                val e = 1f - local
                translationX = dx * 0.5f * e
                translationY = dy * 0.5f * e
                val sc = 1f + 0.4f * e
                scaleX = sc
                scaleY = sc
                alpha = local
            }
            .width(if (!showLabel) iconSize else if (labelWidth != Dp.Unspecified) maxOf(labelWidth, iconSize) else iconSize + 30.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier.graphicsLayer {
                scaleX = scale
                scaleY = scale
                rotationZ = rotation.value
            },
        ) {
            Image(
                bitmap = app.icon,
                contentDescription = app.label,
                modifier = Modifier
                    .size(iconSize)
                    .onGloballyPositioned {
                        val b = it.boundsInWindow()
                        bounds[0] = b
                        // Remember where the icon rests (not while it is flying in).
                        if (fx == null || fx.progress() >= 1f) restCenter[0] = b.center
                    }
                    .combinedClickable(
                        interactionSource = interaction,
                        indication = null,
                        onLongClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onLongClick(bounds[0])
                        },
                        onClick = { onClick(bounds[0]) },
                    ),
            )
            if (jiggle && onRemove != null) {
                Box(
                    Modifier
                        .align(Alignment.TopStart)
                        .offset((-7).dp, (-7).dp)
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(Color(0xE63A3A3C))
                        .clickable(onClick = onRemove),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(Modifier.size(width = 11.dp, height = 2.dp).background(Color.White))
                }
            }
        }
        if (showLabel) {
            Text(
                app.label,
                style = LabelStyle,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 7.dp),
            )
        }
    }
}

object Actions {
    fun launch(activity: Activity, app: AppInfo, r: Rect) {
        val la = activity.getSystemService(LauncherApps::class.java)
        val src = android.graphics.Rect(r.left.toInt(), r.top.toInt(), r.right.toInt(), r.bottom.toInt())
        val opts = ActivityOptions.makeScaleUpAnimation(
            activity.window.decorView, src.left, src.top, src.width(), src.height(),
        ).toBundle()
        try {
            la.startMainActivity(app.component, app.user, src, opts)
        } catch (e: Exception) {
            Toast.makeText(activity, "Can't open ${app.label}", Toast.LENGTH_SHORT).show()
        }
    }

    fun appInfo(ctx: Context, app: AppInfo) {
        runCatching {
            ctx.getSystemService(LauncherApps::class.java).startAppDetailsActivity(app.component, app.user, null, null)
        }
    }

    fun uninstall(ctx: Context, app: AppInfo) {
        runCatching {
            ctx.startActivity(
                Intent(Intent.ACTION_DELETE, Uri.parse("package:${app.component.packageName}"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }
    }

    fun webSearch(ctx: Context, q: String) {
        val ok = runCatching {
            ctx.startActivity(Intent(Intent.ACTION_WEB_SEARCH).putExtra(SearchManager.QUERY, q).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }.isSuccess
        if (!ok) runCatching {
            ctx.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/search?q=" + Uri.encode(q)))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }
    }

    fun homeSettings(ctx: Context) {
        runCatching { ctx.startActivity(Intent(Settings.ACTION_HOME_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    }

    @Suppress("WrongConstant")
    fun expandNotifications(ctx: Context) {
        runCatching {
            val sb = ctx.getSystemService("statusbar")
            Class.forName("android.app.StatusBarManager").getMethod("expandNotificationsPanel").invoke(sb)
        }
    }
}
