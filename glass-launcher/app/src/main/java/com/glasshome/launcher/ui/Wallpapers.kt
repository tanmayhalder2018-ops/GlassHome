package com.glasshome.launcher.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.ImageDecoder
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.annotation.SuppressLint
import android.app.WallpaperManager
import android.content.Intent
import android.graphics.drawable.BitmapDrawable
import android.net.Uri
import android.os.Environment
import android.provider.Settings
import android.view.WindowManager
import androidx.core.graphics.drawable.toBitmap
import com.glasshome.launcher.data.LauncherPrefs
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import java.io.File
import kotlin.math.max
import kotlin.math.roundToInt
import android.graphics.Color as AColor

class WallpaperSet(val full: ImageBitmap, val blurred: ImageBitmap)

class WallpaperPreset(val name: String, val from: String, val to: String, val blobs: List<Blob>)
class Blob(val color: String, val x: Float, val y: Float, val r: Float)

object Wallpapers {
    val presets = listOf(
        WallpaperPreset(
            "Aurora", "#0F0C29", "#302B63",
            listOf(Blob("#FF6FD8", 0.18f, 0.22f, 0.55f), Blob("#3813C2", 0.85f, 0.35f, 0.6f), Blob("#00D2FF", 0.55f, 0.95f, 0.6f)),
        ),
        WallpaperPreset(
            "Sunset", "#FF7E5F", "#FEB47B",
            listOf(Blob("#FF3CAC", 0.1f, 0.1f, 0.6f), Blob("#784BA0", 0.95f, 0.55f, 0.55f), Blob("#2B86C5", 0.3f, 1.0f, 0.6f)),
        ),
        WallpaperPreset(
            "Ocean", "#000851", "#1CB5E0",
            listOf(Blob("#00F5A0", 0.85f, 0.15f, 0.5f), Blob("#00D9F5", 0.15f, 0.65f, 0.55f), Blob("#4A00E0", 0.7f, 0.95f, 0.5f)),
        ),
        WallpaperPreset(
            "Midnight", "#141E30", "#243B55",
            listOf(Blob("#8E2DE2", 0.2f, 0.3f, 0.5f), Blob("#FF0080", 0.9f, 0.8f, 0.45f), Blob("#4A00E0", 0.6f, 0.05f, 0.45f)),
        ),
        WallpaperPreset(
            "Bloom", "#FBC2EB", "#A6C1EE",
            listOf(Blob("#FF9A8B", 0.15f, 0.2f, 0.5f), Blob("#84FAB0", 0.85f, 0.75f, 0.5f), Blob("#8FD3F4", 0.7f, 0.15f, 0.45f)),
        ),
        WallpaperPreset(
            "Ember", "#1A0000", "#3A0A0A",
            listOf(Blob("#FF512F", 0.25f, 0.75f, 0.55f), Blob("#F09819", 0.8f, 0.3f, 0.45f), Blob("#DD2476", 0.6f, 0.9f, 0.45f)),
        ),
    )

    fun render(preset: WallpaperPreset, size: Int): Bitmap {
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        val s = size.toFloat()
        val p = Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG)
        p.shader = LinearGradient(0f, 0f, s * 0.4f, s, AColor.parseColor(preset.from), AColor.parseColor(preset.to), Shader.TileMode.CLAMP)
        c.drawRect(0f, 0f, s, s, p)
        for (b in preset.blobs) {
            val col = AColor.parseColor(b.color)
            p.shader = RadialGradient(
                b.x * s, b.y * s, b.r * s,
                intArrayOf(col, (col and 0x00FFFFFF) or (0x88 shl 24), col and 0x00FFFFFF),
                floatArrayOf(0f, 0.45f, 1f), Shader.TileMode.CLAMP,
            )
            c.drawRect(0f, 0f, s, s, p)
        }
        return bmp
    }

    private fun copyFile(ctx: Context) = File(ctx.filesDir, "wallpaper.jpg")

    /** True when Android lets us read the system wallpaper (needed for blur over it). */
    fun hasSystemAccess(): Boolean = Environment.isExternalStorageManager()

    fun accessIntent(ctx: Context): Intent =
        Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:" + ctx.packageName))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    fun systemId(ctx: Context): Int =
        runCatching { WallpaperManager.getInstance(ctx).getWallpaperId(WallpaperManager.FLAG_SYSTEM) }.getOrDefault(-1)

    private fun screenMax(ctx: Context): Int {
        val b = ctx.getSystemService(WindowManager::class.java).maximumWindowMetrics.bounds
        return max(b.width(), b.height())
    }

    /** Renders a preset at full screen size and sets it as the system (and optionally lock) wallpaper. */
    fun applyPreset(ctx: Context, prefs: LauncherPrefs, index: Int, lockToo: Boolean): Boolean = runCatching {
        val bmp = render(presets[index.coerceIn(0, presets.lastIndex)], screenMax(ctx).coerceIn(1024, 3200))
        applyBitmap(ctx, prefs, bmp, lockToo)
    }.getOrDefault(false)

    fun applyPhoto(ctx: Context, prefs: LauncherPrefs, uri: Uri, lockToo: Boolean): Boolean = runCatching {
        val src = ImageDecoder.createSource(ctx.contentResolver, uri)
        val bmp = ImageDecoder.decodeBitmap(src) { decoder, info, _ ->
            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
            val longest = max(info.size.width, info.size.height)
            var sample = 1
            while (longest / (sample * 2) >= 2800) sample *= 2
            decoder.setTargetSampleSize(sample)
        }
        applyBitmap(ctx, prefs, bmp, lockToo)
    }.getOrDefault(false)

    private fun applyBitmap(ctx: Context, prefs: LauncherPrefs, bmp: Bitmap, lockToo: Boolean): Boolean {
        val wm = WallpaperManager.getInstance(ctx)
        val flags = WallpaperManager.FLAG_SYSTEM or (if (lockToo) WallpaperManager.FLAG_LOCK else 0)
        wm.setBitmap(bmp, null, true, flags)
        copyFile(ctx).outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 95, it) }
        prefs.copyWallpaperId = systemId(ctx)
        return true
    }

    @SuppressLint("MissingPermission")
    private fun readSystem(ctx: Context): Bitmap? = runCatching {
        val wm = WallpaperManager.getInstance(ctx)
        if (wm.wallpaperInfo != null) return null // live wallpaper: let the system draw it
        val d = wm.drawable ?: return null
        var b = (d as? BitmapDrawable)?.bitmap ?: d.toBitmap()
        if (b.config == Bitmap.Config.HARDWARE) b = b.copy(Bitmap.Config.ARGB_8888, false)
        val longest = max(b.width, b.height)
        if (longest > 3200) {
            val f = 3200f / longest
            b = Bitmap.createScaledBitmap(b, (b.width * f).roundToInt(), (b.height * f).roundToInt(), true)
        }
        b
    }.getOrNull()

    /**
     * Finds the picture that is really on the system home screen.
     * Returns null when we can't read it: the launcher is then transparent and Android draws the wallpaper itself.
     */
    fun resolve(ctx: Context, prefs: LauncherPrefs): WallpaperSet? {
        val bmp = when {
            hasSystemAccess() -> readSystem(ctx)
            prefs.copyWallpaperId == systemId(ctx) && copyFile(ctx).exists() -> BitmapFactory.decodeFile(copyFile(ctx).path)
            else -> null
        } ?: return null
        val blurred = blur(bmp)
        bmp.prepareToDraw()
        return WallpaperSet(bmp.asImageBitmap(), blurred.asImageBitmap())
    }

    private fun blur(src: Bitmap): Bitmap {
        val targetW = 150
        var cur = src
        while (cur.width / 2 >= targetW) {
            val next = Bitmap.createScaledBitmap(cur, cur.width / 2, cur.height / 2, true)
            if (cur !== src) cur.recycle()
            cur = next
        }
        val th = (targetW * cur.height / cur.width.toFloat()).roundToInt().coerceAtLeast(1)
        val small = Bitmap.createScaledBitmap(cur, targetW, th, true)
        return boxBlur(small, 4, 3)
    }

    private fun boxBlur(bmp: Bitmap, radius: Int, passes: Int): Bitmap {
        val w = bmp.width
        val h = bmp.height
        val px = IntArray(w * h)
        bmp.getPixels(px, 0, w, 0, 0, w, h)
        val tmp = IntArray(w * h)
        repeat(passes) {
            pass(px, tmp, w, h, radius, true)
            pass(tmp, px, w, h, radius, false)
        }
        return Bitmap.createBitmap(px, w, h, Bitmap.Config.ARGB_8888)
    }

    private fun pass(src: IntArray, dst: IntArray, w: Int, h: Int, r: Int, horizontal: Boolean) {
        val len = if (horizontal) w else h
        val lines = if (horizontal) h else w
        val div = 2 * r + 1
        for (line in 0 until lines) {
            fun at(i: Int): Int {
                val k = i.coerceIn(0, len - 1)
                return if (horizontal) src[line * w + k] else src[k * w + line]
            }
            var a = 0; var rr = 0; var g = 0; var b = 0
            for (i in -r..r) {
                val c = at(i)
                a += c ushr 24; rr += (c shr 16) and 0xFF; g += (c shr 8) and 0xFF; b += c and 0xFF
            }
            for (i in 0 until len) {
                val out = ((a / div) shl 24) or ((rr / div) shl 16) or ((g / div) shl 8) or (b / div)
                if (horizontal) dst[line * w + i] = out else dst[i * w + line] = out
                val cOut = at(i - r)
                val cIn = at(i + r + 1)
                a += (cIn ushr 24) - (cOut ushr 24)
                rr += ((cIn shr 16) and 0xFF) - ((cOut shr 16) and 0xFF)
                g += ((cIn shr 8) and 0xFF) - ((cOut shr 8) and 0xFF)
                b += (cIn and 0xFF) - (cOut and 0xFF)
            }
        }
    }
}
