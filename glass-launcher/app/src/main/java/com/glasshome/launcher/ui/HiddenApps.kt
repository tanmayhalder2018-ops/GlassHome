package com.glasshome.launcher.ui

import android.app.Activity
import android.app.KeyguardManager
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.CancellationSignal
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.glasshome.launcher.data.AppInfo
import kotlinx.coroutines.launch

/** Unlocks with the phone's own lock screen methods (fingerprint, face, PIN, pattern, password). */
object DeviceLock {
    fun available(activity: Activity): Boolean {
        val km = activity.getSystemService(KeyguardManager::class.java)
        return km?.isDeviceSecure == true
    }

    fun authenticate(activity: Activity, onSuccess: () -> Unit, onError: (String) -> Unit) {
        val prompt = BiometricPrompt.Builder(activity)
            .setTitle("Hidden apps")
            .setSubtitle("Unlock to see your hidden apps")
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_WEAK or BiometricManager.Authenticators.DEVICE_CREDENTIAL,
            )
            .build()
        runCatching {
            prompt.authenticate(
                CancellationSignal(),
                activity.mainExecutor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = onSuccess()
                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) =
                        // Silent when the user simply backs out.
                        onError(if (errorCode == 5 || errorCode == 10 || errorCode == 13) "" else errString.toString())
                },
            )
        }.onFailure { onError(it.message ?: "Unlock not available") }
    }
}

enum class PinMode { Verify, Create, Confirm }

/** iPhone-style passcode screen. */
@Composable
fun PinPad(
    title: String,
    subtitle: String,
    attempt: Int,
    onComplete: (String) -> Unit,
    onCancel: () -> Unit,
) {
    var pin by remember { mutableStateOf("") }
    val shake = remember { Animatable(0f) }
    val haptic = LocalHapticFeedback.current
    val error = attempt > 0
    LaunchedEffect(attempt, subtitle) {
        if (error) {
            pin = ""
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            for (x in listOf(18f, -16f, 12f, -8f, 4f, 0f)) shake.animateTo(x, spring(stiffness = 3000f))
        } else {
            pin = ""
        }
    }
    fun press(d: String) {
        if (pin.length >= 6) return
        pin += d
        if (pin.length == 6) onComplete(pin)
    }
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.55f))
            .pointerInput(Unit) { detectTapGestures { } }
            .windowInsetsPadding(WindowInsets.systemBars),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Lock, null, tint = Color.White, modifier = Modifier.size(28.dp))
            Spacer(Modifier.height(12.dp))
            Text(title, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
            Text(
                subtitle,
                color = if (error) Color(0xFFFF453A) else Color.White.copy(alpha = 0.7f),
                fontSize = 14.sp, textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 6.dp, start = 24.dp, end = 24.dp),
            )
            Spacer(Modifier.height(24.dp))
            Row(
                Modifier.graphicsLayer { translationX = shake.value.dp.toPx() },
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                repeat(6) { i ->
                    Box(
                        Modifier
                            .size(14.dp)
                            .clip(CircleShape)
                            .background(if (i < pin.length) Color.White else Color.White.copy(alpha = 0.25f)),
                    )
                }
            }
            Spacer(Modifier.height(32.dp))
            val keys = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫")
            keys.chunked(3).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(22.dp), modifier = Modifier.padding(vertical = 8.dp)) {
                    row.forEach { k ->
                        Box(
                            Modifier
                                .size(76.dp)
                                .clip(CircleShape)
                                .background(if (k.isEmpty() || k == "⌫") Color.Transparent else Color.White.copy(alpha = 0.16f))
                                .clickable(enabled = k.isNotEmpty()) {
                                    if (k == "⌫") pin = pin.dropLast(1) else press(k)
                                },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(k, color = Color.White, fontSize = if (k == "⌫") 24.sp else 30.sp, fontWeight = FontWeight.Light)
                        }
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(
                "Cancel", color = Color.White, fontSize = 17.sp,
                modifier = Modifier.clip(RoundedCornerShape(50)).clickable(onClick = onCancel).padding(horizontal = 18.dp, vertical = 10.dp),
            )
        }
    }
}

/** The unlocked "Hidden" folder: tap to open, long-press for options (unhide …). */
@Composable
fun HiddenAppsSheet(
    progress: () -> Float,
    apps: List<AppInfo>,
    iconSize: Dp,
    labelWidth: Dp,
    onLaunch: (AppInfo, Rect) -> Unit,
    onLongClick: (AppInfo, Rect) -> Unit,
    onDismiss: () -> Unit,
    title: String = "Hidden",
    locked: Boolean = true,
) {
    Box(
        Modifier
            .fillMaxSize()
            .graphicsLayer { alpha = progress().coerceIn(0f, 1f) }
            .background(Color.Black.copy(alpha = 0.3f))
            .pointerInput(Unit) { detectTapGestures { onDismiss() } }
            .windowInsetsPadding(WindowInsets.systemBars),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            Modifier
                .padding(20.dp)
                .widthIn(max = 720.dp)
                .fillMaxWidth()
                .graphicsLayer {
                    val s = 0.85f + 0.15f * progress()
                    scaleX = s; scaleY = s
                }
                .clip(RoundedCornerShape(36.dp))
                .background(Color(0xE61C1C1E))
                .pointerInput(Unit) { detectTapGestures { } }
                .padding(20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (locked) {
                    Icon(Icons.Default.Lock, null, tint = Color.White, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                }
                Text(title, color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Box(
                    Modifier.size(34.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.12f)).clickable(onClick = onDismiss),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Default.Close, "Close", tint = Color.White, modifier = Modifier.size(18.dp)) }
            }
            if (apps.isEmpty()) {
                Text(
                    "No hidden apps yet.\nLong-press any app and choose “Hide & Lock”.",
                    color = Color.White.copy(alpha = 0.6f), fontSize = 15.sp, textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp),
                )
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(labelWidth.coerceAtLeast(iconSize + 20.dp)),
                    modifier = Modifier.fillMaxWidth().height((iconSize + 60.dp) * 3.5f),
                    contentPadding = PaddingValues(top = 12.dp),
                ) {
                    items(apps, key = { it.key }) { app ->
                        Box(Modifier.padding(vertical = 10.dp), contentAlignment = Alignment.Center) {
                            AppIcon(
                                app = app, iconSize = iconSize, showLabel = true, jiggle = false,
                                onClick = { r -> onLaunch(app, r) },
                                onLongClick = { r -> onLongClick(app, r) },
                                labelWidth = labelWidth,
                            )
                        }
                    }
                }
            }
        }
    }
}

