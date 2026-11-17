package com.glasshome.launcher

import android.content.Intent
import android.content.pm.ActivityInfo
import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.lifecycleScope
import com.glasshome.launcher.data.AppRepository
import com.glasshome.launcher.data.LauncherPrefs
import com.glasshome.launcher.ui.LauncherApp
import com.glasshome.launcher.ui.WidgetController
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

class MainActivity : ComponentActivity() {
    private val _homeEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    /** Fires when Home is pressed while the launcher is already showing. */
    val homeEvents: SharedFlow<Unit> = _homeEvents

    private lateinit var repo: AppRepository
    private lateinit var widgets: WidgetController
    private var visible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        window.isNavigationBarContrastEnforced = false
        val phone = BuildConfig.PHONE || resources.configuration.smallestScreenWidthDp < 600
        if (phone) requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        preferHighestRefreshRate()

        val prefs = LauncherPrefs(applicationContext)
        repo = AppRepository(applicationContext, lifecycleScope)
        repo.start()
        widgets = WidgetController(this)
        setContent { LauncherApp(this, repo, prefs, widgets, phone) }
    }

    /** Ask for 90/120 Hz: many phones keep third-party launchers at 60 Hz otherwise. */
    private fun preferHighestRefreshRate() {
        runCatching {
            val d = display ?: return
            val cur = d.mode
            val best = d.supportedModes
                .filter { it.physicalWidth == cur.physicalWidth && it.physicalHeight == cur.physicalHeight }
                .maxByOrNull { it.refreshRate } ?: return
            window.attributes = window.attributes.apply { preferredDisplayModeId = best.modeId }
        }
    }

    override fun onStart() {
        super.onStart()
        widgets.startListening()
        repo.reload(null)
    }

    override fun onResume() {
        super.onResume()
        visible = true
    }

    override fun onStop() {
        super.onStop()
        visible = false
        widgets.stopListening()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (visible && intent.action == Intent.ACTION_MAIN && intent.hasCategory(Intent.CATEGORY_HOME)) {
            _homeEvents.tryEmit(Unit)
        }
    }

    @Deprecated("Needed for the AppWidget bind/configure flow")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        widgets.onActivityResult(requestCode, resultCode)
    }

    override fun onDestroy() {
        repo.stop()
        super.onDestroy()
    }
}
