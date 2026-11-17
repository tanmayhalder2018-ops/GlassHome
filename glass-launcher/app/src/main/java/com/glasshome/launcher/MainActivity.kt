package com.glasshome.launcher

import android.content.Intent
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
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

class MainActivity : ComponentActivity() {
    private val _homeEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    /** Fires when Home is pressed while the launcher is already showing. */
    val homeEvents: SharedFlow<Unit> = _homeEvents

    private lateinit var repo: AppRepository
    private var visible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        window.isNavigationBarContrastEnforced = false
        val prefs = LauncherPrefs(applicationContext)
        repo = AppRepository(applicationContext, lifecycleScope)
        repo.start()
        setContent { LauncherApp(this, repo, prefs) }
    }

    override fun onStart() {
        super.onStart()
        repo.reload(null)
    }

    override fun onResume() {
        super.onResume()
        visible = true
    }

    override fun onStop() {
        super.onStop()
        visible = false
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (visible && intent.action == Intent.ACTION_MAIN && intent.hasCategory(Intent.CATEGORY_HOME)) {
            _homeEvents.tryEmit(Unit)
        }
    }

    override fun onDestroy() {
        repo.stop()
        super.onDestroy()
    }
}
