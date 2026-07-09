package com.testhub.pages;

import com.testhub.pages.components.ConfirmDialogComponent;
import com.testhub.pages.components.ModalComponent;
import com.testhub.pages.components.NavbarComponent;
import com.testhub.pages.components.SidebarComponent;

/**
 * Base for every authenticated page. Exposes the chrome shared by the whole
 * app shell (top navbar, left sidebar, the create/edit modal, the confirm
 * dialog) so individual pages don't re-declare them.
 */
public abstract class BaseAppPage extends BasePage {

    private final NavbarComponent navbar = new NavbarComponent();
    private final SidebarComponent sidebar = new SidebarComponent();
    private final ModalComponent modal = new ModalComponent();
    private final ConfirmDialogComponent confirmDialog = new ConfirmDialogComponent();

    public NavbarComponent navbar() {
        return navbar;
    }

    public SidebarComponent sidebar() {
        return sidebar;
    }

    public ModalComponent modal() {
        return modal;
    }

    public ConfirmDialogComponent confirmDialog() {
        return confirmDialog;
    }
}
