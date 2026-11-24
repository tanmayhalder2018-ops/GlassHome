package com.glasshome.launcher.ui

import android.content.pm.ApplicationInfo
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.glasshome.launcher.data.AppInfo

@Immutable
class AppFolder(val name: String, val apps: List<AppInfo>)

/** Sorts apps into iPhone-style App Library categories. */
object Categorizer {
    private class Rule(val name: String, val category: Int?, val words: List<String>)

    // First match wins. Words are matched against the package name and the app label.
    private val rules = listOf(
        Rule("Social", ApplicationInfo.CATEGORY_SOCIAL, listOf("whatsapp", "instagram", "facebook", "katana", "telegram", "snapchat", "twitter", "threads", "messenger", "messaging", "mms", "discord", "linkedin", "signal", "sharechat", "moj", "truecaller", "reddit", "pinterest")),
        Rule("Finance", null, listOf("pay", "paytm", "phonepe", "paisa", "bank", "upi", "wallet", "icici", "sbi", "hdfc", "axis", "kotak", "zerodha", "groww", "upstox", "cred", "bhim", "finance", "money")),
        Rule("Shopping", null, listOf("amazon", "flipkart", "myntra", "meesho", "ajio", "buyhatke", "nykaa", "blinkit", "zepto", "bigbasket", "swiggy", "zomato", "shop", "jiomart", "snapdeal")),
        Rule("Games", ApplicationInfo.CATEGORY_GAME, listOf("game", "pubg", "bgmi", "freefire", "ludo", "chess", "candy", "clash", "minecraft", "roblox")),
        Rule("Entertainment", ApplicationInfo.CATEGORY_VIDEO, listOf("youtube", "netflix", "hotstar", "primevideo", "avod", "jiocinema", "zee5", "sonyliv", "mxplayer", "tv", "video", "dhamaka", "hoichoi")),
        Rule("Music & Audio", ApplicationInfo.CATEGORY_AUDIO, listOf("music", "spotify", "gaana", "saavn", "wynk", "audio", "podcast", "chord", "fender", "guitar", "tuner", "recorder", "soundcloud")),
        Rule("Photo & Video", ApplicationInfo.CATEGORY_IMAGE, listOf("camera", "gallery", "photos", "capcut", "canva", "snapseed", "lightroom", "picsart", "inshot", "vn", "editor", "creator", "remini")),
        Rule("Productivity", ApplicationInfo.CATEGORY_PRODUCTIVITY, listOf("docs", "sheets", "slides", "drive", "gm", "gmail", "mail", "calendar", "notes", "keep", "office", "word", "excel", "notion", "chatgpt", "openai", "claude", "gemini", "bard", "copilot", "meet", "zoom", "teams", "workspace", "scanner", "pdf")),
        Rule("Travel & Maps", ApplicationInfo.CATEGORY_MAPS, listOf("maps", "uber", "ola", "rapido", "irctc", "makemytrip", "goibibo", "redbus", "railway", "travel", "airbnb", "indigo")),
        Rule("News & Reading", ApplicationInfo.CATEGORY_NEWS, listOf("news", "inshorts", "anandabazar", "times", "kindle", "books", "reader", "dailyhunt")),
        Rule("Education", null, listOf("adda247", "byju", "unacademy", "duolingo", "classroom", "edu", "learn", "testbook", "physicswallah", "khan")),
        Rule("Utilities", ApplicationInfo.CATEGORY_ACCESSIBILITY, listOf("settings", "clock", "calculator", "compass", "files", "filemanager", "myfiles", "contacts", "dialer", "phone", "authenticator", "digilocker", "aadhaar", "uidai", "clone", "weather", "torch", "backup", "security", "vpn", "launcher", "store", "vending", "browser", "chrome", "sbrowser", "firefox", "opera")),
    )

    private fun match(app: AppInfo): String {
        val pkg = app.component.packageName.lowercase()
        val label = app.label.lowercase()
        for (r in rules) {
            if (r.category != null && app.category == r.category) return r.name
        }
        for (r in rules) {
            if (r.words.any { w -> pkg.split('.', '_').any { it == w || (w.length >= 4 && it.contains(w)) } || label.contains(w) && w.length >= 4 }) {
                return r.name
            }
        }
        return "Other"
    }

    fun folders(apps: List<AppInfo>, lastLaunch: Map<String, Long>): List<AppFolder> {
        val out = mutableListOf<AppFolder>()
        val recent = apps.filter { (lastLaunch[it.key] ?: 0L) > 0L }.sortedByDescending { lastLaunch[it.key] }.take(8)
        if (recent.isNotEmpty()) out += AppFolder("Suggestions", recent)
        val weekAgo = System.currentTimeMillis() - 14L * 24 * 3600 * 1000
        val added = apps.filter { it.installed > weekAgo }.sortedByDescending { it.installed }.take(8)
        if (added.isNotEmpty()) out += AppFolder("Recently Added", added)
        val groups = apps.groupBy { match(it) }
        // Busiest folders first (like iPhone sorts by use), "Other" always last.
        groups.filterKeys { it != "Other" }.entries
            .sortedByDescending { (_, list) -> list.sumOf { lastLaunch[it.key] ?: 0L } / 1000 + list.size }
            .forEach { (name, list) ->
                out += AppFolder(name, list.sortedByDescending { lastLaunch[it.key] ?: 0L })
            }
        groups["Other"]?.let { out += AppFolder("Other", it) }
        return out
    }
}

/**
 * iPhone App Library tile: three big icons that open their app straight away,
 * and a mini grid in the fourth corner that opens the whole folder.
 */
@Composable
fun FolderCard(
    folder: AppFolder,
    onLaunch: (AppInfo, Rect) -> Unit,
    onLongClick: (AppInfo, Rect) -> Unit,
    onOpen: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        BoxWithConstraints(
            Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(30.dp))
                .background(Color.White.copy(alpha = 0.16f))
                .clickable(onClick = onOpen)
                .padding(14.dp),
        ) {
            val gap = 12.dp
            val slot = (maxWidth - gap) / 2
            val apps = folder.apps
            val showMini = apps.size > 4
            Column(verticalArrangement = Arrangement.spacedBy(gap)) {
                for (row in 0..1) {
                    Row(horizontalArrangement = Arrangement.spacedBy(gap)) {
                        for (col in 0..1) {
                            val i = row * 2 + col
                            Box(Modifier.size(slot), contentAlignment = Alignment.Center) {
                                if (i == 3 && showMini) {
                                    MiniGrid(apps.drop(3).take(4), slot, onOpen)
                                } else {
                                    apps.getOrNull(i)?.let { app ->
                                        androidx.compose.runtime.key(app.key) {
                                            AppIcon(
                                                app = app, iconSize = slot, showLabel = false, jiggle = false,
                                                onClick = { r -> onLaunch(app, r) },
                                                onLongClick = { r -> onLongClick(app, r) },
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
        Text(
            folder.name,
            color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Medium,
            maxLines = 1, overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 7.dp),
        )
    }
}

@Composable
private fun MiniGrid(apps: List<AppInfo>, size: androidx.compose.ui.unit.Dp, onOpen: () -> Unit) {
    val gap = size * 0.08f
    val mini = (size - gap) / 2
    Column(
        Modifier.size(size).clip(RoundedCornerShape(size * 0.22f)).clickable(onClick = onOpen),
        verticalArrangement = Arrangement.spacedBy(gap),
    ) {
        for (row in 0..1) {
            Row(horizontalArrangement = Arrangement.spacedBy(gap)) {
                for (col in 0..1) {
                    val app = apps.getOrNull(row * 2 + col)
                    Box(Modifier.size(mini)) {
                        if (app != null) Image(app.icon, app.label, Modifier.fillMaxSize())
                    }
                }
            }
        }
    }
}
