package org.jenkinsci.plugins.codehealth.service;

import hudson.model.AbstractBuild;
import hudson.model.TopLevelItem;
import org.jenkinsci.plugins.codehealth.Issue;
import org.jenkinsci.plugins.codehealth.model.IssueEntity;
import org.jenkinsci.plugins.codehealth.model.State;

import java.util.Collection;
import java.util.List;

/**
 * @author Michael Prankl
 */
public abstract class IssueRepository {

    /**
     * Updates new or open issues.
     *
     * @param data  the collection of found issues
     * @param build the build which produced the issues
     */
    public abstract void updateIssues(Collection<IssueEntity> data, AbstractBuild<?, ?> build);

    /**
     * Mark some issues as fixed.
     *
     * @param data  the issues that have been fixed
     * @param build the corresponding build
     */
    public abstract void fixedIssues(Collection<IssueEntity> data, AbstractBuild<?, ?> build);

    /**
     * Load all issues for this top-level-item.
     *
     * @param topLevelItem the top-level-item (job)
     * @return all Issues for this top-level-item
     */
    public abstract Collection<IssueEntity> loadIssues(TopLevelItem topLevelItem);

    /**
     * Load state-specific issues for this top-level-item.
     *
     * @param topLevelItem the top-level-item (job)
     * @param states       the allowed states (open, new, closed)
     * @return the found issues
     */
    public abstract Collection<IssueEntity> loadIssues(TopLevelItem topLevelItem, List<State> states);

    /**
     * Load all issues which have been in this state for this build.
     *
     * @param topLevelItem the top-level-item (job)
     * @param buildNr      the corresponding build number
     * @param state        the corresponding state
     * @return the found issues
     */
    public abstract Collection<IssueEntity> loadIssues(TopLevelItem topLevelItem, int buildNr, State state);

}
